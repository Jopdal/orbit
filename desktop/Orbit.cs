using System;
using System.IO;
using System.Drawing;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using System.Web.Script.Serialization;
using System.Collections.Generic;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

internal static class Program
{
    [STAThread]
    static void Main()
    {
        bool created;
        using (var mutex = new Mutex(true, "Local\\OrbitScheduleDesktop", out created))
        {
            if (!created) { MessageBox.Show("Orbit가 이미 실행 중입니다. 작업 표시줄에서 열어 주세요.", "Orbit"); return; }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new OrbitWindow());
        }
    }
}

internal sealed class OrbitWindow : Form
{
    readonly WebView2 view = new WebView2();
    readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 20000000 };
    readonly string dataRoot;
    readonly string dataFile;
    string currentJson;
    bool initialized;
    public OrbitWindow()
    {
        Text = "Orbit — 프로젝트의 흐름";
        Width = 1360; Height = 920; MinimumSize = new Size(820, 620);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(251, 251, 253);
        var iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Orbit.ico");
        if (File.Exists(iconPath)) Icon = new Icon(iconPath);
        dataRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Orbit");
        // An isolated profile is available for development verification.
        foreach (string arg in Environment.GetCommandLineArgs())
            if (arg.StartsWith("--data-dir=")) dataRoot = Path.GetFullPath(arg.Substring(11));
        dataFile = Path.Combine(dataRoot, "workspace.json");
        view.Dock = DockStyle.Fill;
        Controls.Add(view);
        Shown += async delegate
        {
            try
            {
                Directory.CreateDirectory(dataRoot);
                currentJson = File.Exists(dataFile) ? File.ReadAllText(dataFile, Encoding.UTF8) : "null";
                json.DeserializeObject(currentJson);
                var env = await CoreWebView2Environment.CreateAsync(null, Path.Combine(dataRoot, "WebView2"));
                await view.EnsureCoreWebView2Async(env);
                view.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
                view.CoreWebView2.Settings.IsGeneralAutofillEnabled = false;
                view.CoreWebView2.Settings.IsPasswordAutosaveEnabled = false;
                view.CoreWebView2.Settings.AreDevToolsEnabled = false;
                view.CoreWebView2.Settings.IsStatusBarEnabled = false;
                view.CoreWebView2.Settings.IsZoomControlEnabled = false;
                view.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = false;
                view.CoreWebView2.SetVirtualHostNameToFolderMapping("orbit.local",
                    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ui"), CoreWebView2HostResourceAccessKind.DenyCors);
                view.CoreWebView2.WebMessageReceived += OnMessage;
                view.CoreWebView2.NewWindowRequested += delegate(object sender, CoreWebView2NewWindowRequestedEventArgs e) { e.Handled = true; };
                view.CoreWebView2.NavigationStarting += delegate(object sender, CoreWebView2NavigationStartingEventArgs e)
                {
                    if (!e.Uri.StartsWith("https://orbit.local/", StringComparison.OrdinalIgnoreCase)) e.Cancel = true;
                };
                view.CoreWebView2.AddWebResourceRequestedFilter("*", CoreWebView2WebResourceContext.All);
                view.CoreWebView2.WebResourceRequested += delegate(object sender, CoreWebView2WebResourceRequestedEventArgs e)
                {
                    var uri = new Uri(e.Request.Uri);
                    if (uri.Scheme == "https" && uri.Host == "orbit.local") return;
                    if (uri.Scheme == "data" || uri.Scheme == "blob") return;
                    e.Response = view.CoreWebView2.Environment.CreateWebResourceResponse(new MemoryStream(), 403, "Offline application", "");
                };
                await view.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(
                    "window.__ORBIT_DESKTOP__=true;window.__ORBIT_INITIAL__=" + currentJson + ";");
                initialized = true;
                view.Source = new Uri("https://orbit.local/index.html");
            }
            catch (Exception ex)
            {
                MessageBox.Show("Orbit를 시작하지 못했습니다. 기존 일정 파일은 변경하지 않았습니다.\n\n" +
                    ex.Message + "\n\n데이터 폴더: " + dataRoot +
                    "\nMicrosoft Edge WebView2 Runtime 설치 여부를 확인해 주세요.", "Orbit", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Close();
            }
        };
        FormClosing += delegate { if (initialized) view.Dispose(); };
    }
    void Reply(string type, string message)
    {
        view.CoreWebView2.PostWebMessageAsJson(json.Serialize(new { type = type, message = message }));
    }
    void Persist(string data)
    {
        json.DeserializeObject(data);
        string temporary = dataFile + ".tmp";
        File.WriteAllText(temporary, data, new UTF8Encoding(false));
        if (File.Exists(dataFile)) File.Replace(temporary, dataFile, dataFile + ".previous", true);
        else File.Move(temporary, dataFile);
        currentJson = data;
    }
    void OnMessage(object sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        if (!e.Source.StartsWith("https://orbit.local/", StringComparison.OrdinalIgnoreCase)) return;
        try
        {
            var message = json.Deserialize<Dictionary<string, object>>(e.WebMessageAsJson);
            var type = Convert.ToString(message["type"]);
            if (type == "mail-refresh")
            {
                var items = new List<object>();
                string info = "메일 관리 연결 설정이 없습니다.";
                string configPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "mail-config.json");
                if (File.Exists(configPath))
                {
                    var config = json.Deserialize<Dictionary<string, object>>(File.ReadAllText(configPath, Encoding.UTF8));
                    string inbox = Convert.ToString(config["inbox"]);
                    int errors = 0;
                    if (Directory.Exists(inbox)) foreach (string file in Directory.GetFiles(inbox, "*.json"))
                    {
                        try { if (new FileInfo(file).Length > 200000) throw new Exception("size"); items.Add(json.DeserializeObject(File.ReadAllText(file, Encoding.UTF8))); }
                        catch { errors++; }
                    }
                    info = "대기 제안 " + items.Count + "개 · 한국 시간 09/12/15/18시 조회" + (errors > 0 ? " · 읽지 못한 파일 " + errors + "개" : "");
                }
                view.CoreWebView2.PostWebMessageAsJson(json.Serialize(new { type = "mail-queue", items = items, message = info }));
            }
            else if (type == "mail-commit")
            {
                string requestId = Convert.ToString(message["requestId"]);
                try
                {
                    Persist(json.Serialize(message["data"]));
                    view.CoreWebView2.PostWebMessageAsJson(json.Serialize(new { type = "mail-committed", requestId = requestId }));
                }
                catch (Exception ex)
                {
                    view.CoreWebView2.PostWebMessageAsJson(json.Serialize(new { type = "mail-failed", requestId = requestId, message = "반영하지 못했습니다: " + ex.Message }));
                }
            }
            else if (type == "mail-open")
            {
                var uri = new Uri(Convert.ToString(message["url"]));
                if (uri.Scheme != "https" || uri.UserInfo.Length > 0 || !(uri.Host == "outlook.office.com" || uri.Host == "outlook.office365.com" || uri.Host == "outlook.live.com")) throw new Exception("Outlook 링크만 열 수 있습니다.");
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
            }
            else if (type == "save")
            {
                Persist(json.Serialize(message["data"]));
                Reply("saved", "PC에 저장했습니다.");
            }
            else if (type == "export")
            {
                using (var dialog = new SaveFileDialog { Title = "Orbit 일정 백업", Filter = "Orbit JSON 백업 (*.json)|*.json", FileName = "Orbit-backup-" + DateTime.Now.ToString("yyyy-MM-dd") + ".json", DefaultExt = "json" })
                    if (dialog.ShowDialog(this) == DialogResult.OK)
                    {
                        File.WriteAllText(dialog.FileName, json.Serialize(message["data"]), new UTF8Encoding(false));
                        Reply("notice", "백업 파일을 저장했습니다.");
                    }
            }
            else if (type == "import")
            {
                using (var dialog = new OpenFileDialog { Title = "Orbit 백업 가져오기", Filter = "Orbit JSON 백업 (*.json)|*.json" })
                    if (dialog.ShowDialog(this) == DialogResult.OK)
                    {
                        if (new FileInfo(dialog.FileName).Length > 10000000) throw new Exception("백업 파일 크기는 10MB 이하여야 합니다.");
                        var data = json.DeserializeObject(File.ReadAllText(dialog.FileName, Encoding.UTF8));
                        if (File.Exists(dataFile))
                        {
                            string backup = Path.Combine(dataRoot, "Backups");
                            Directory.CreateDirectory(backup);
                            File.Copy(dataFile, Path.Combine(backup, "before-import-" + DateTime.Now.ToString("yyyyMMdd-HHmmss-fff") + ".json"));
                        }
                        view.CoreWebView2.PostWebMessageAsJson(json.Serialize(new { type = "import-data", data = data }));
                    }
            }
        }
        catch (Exception ex) { Reply("error", "저장 또는 파일 작업에 실패했습니다: " + ex.Message); }
    }
}
