import fs from 'node:fs';
let app=fs.readFileSync('dist/app.js','utf8');
app=app.replace("case 'export':exportData();toast('백업 파일을 내려받았습니다.');break;case 'import':$('#import-file').click();break;", "case 'export':exportData();if(!DESKTOP)toast('백업 파일을 내려받았습니다.');break;case 'import':if(DESKTOP)window.chrome.webview.postMessage({type:'import'});else $('#import-file').click();break;");
app=app.replace('기록은 현재 브라우저에 자동 저장됩니다.', '기록은 현재 PC의 Orbit 데이터 폴더에 자동 저장됩니다.');
app=app.replace('실행 전 현재 데이터를 자동으로 백업합니다.', '실행 전 현재 데이터를 자동으로 백업합니다. 데이터 위치: %LOCALAPPDATA%/Orbit/workspace.json');
fs.writeFileSync('dist/app.js',app);
let css=fs.readFileSync('dist/style.css','utf8');
css=css.split('\n').filter(line=>!line.startsWith('@import')).join('\n').replace("'DM Sans','Noto Sans KR',sans-serif","'Segoe UI','Malgun Gothic',sans-serif");
fs.writeFileSync('dist/style.css',css);
fs.writeFileSync('README.KO.md',[
 '# Orbit — Windows 데스크톱 프로그램',
 '',
 'release/Orbit/Orbit.exe를 더블클릭하세요. 별도 브라우저나 웹 서버는 필요하지 않습니다.',
 '배포할 때는 Orbit-Windows-x64.zip 전체를 전달하고 압축을 푼 뒤 실행하세요.',
 'Orbit.exe 옆의 DLL과 ui 폴더는 함께 있어야 합니다.',
 '',
 '지원 환경: Windows 10/11 x64, .NET Framework 4.6.2 이상, Microsoft Edge WebView2 Runtime.',
 '현재 PC에서 WebView2 Runtime을 확인했습니다. 앱은 별도 웹페이지에 접속하지 않습니다.',
 'UI 렌더링에 내장 WebView2를 사용하며 외부 네트워크 요청은 차단합니다.',
 '',
 '## 데이터',
 '일정 파일: %LOCALAPPDATA%/Orbit/workspace.json',
 '직전 저장 사본: workspace.json.previous',
 '가져오기 전 사본: %LOCALAPPDATA%/Orbit/Backups/',
 '설정 버튼에서 Windows 파일 대화상자로 JSON 백업/복원을 할 수 있습니다.',
 '서버 업로드나 기기 간 동기화, 실시간 공동 편집은 포함하지 않습니다.',
 '처음 실행하면 예제 프로젝트를 제공합니다. 모든 항목은 편집/삭제할 수 있습니다.',
 '',
 '## 사용',
 '프로젝트 선택 → 하위 프로젝트 타임라인 → 업무별 현황 순서로 이동합니다.',
 '프로젝트와 업무를 추가하고 시작일/종료일/담당자/진행률/메모를 기록합니다.',
 '종료일을 비우면 시작일 이후로 계속 이어지는 막대로 표시합니다.',
 '우선순위는 ⠿ 드래그 또는 ▲/▼ 버튼으로 변경합니다.',
 '2주/월간, 이전/다음 기간, 오늘 버튼으로 시간축을 탐색합니다.',
 '자재 수급/회로도/데이터시트 업무와 시간순 변경 이력을 함께 표시합니다.',
 '',
 '## 개발',
 'desktop/Orbit.cs: Windows 앱과 파일 저장, 백업/복원',
 'dist/: 앱 내부 UI',
 'desktop/build.ps1: 실행 파일 및 ZIP 생성',
 'node tests.mjs: 데이터 검증과 타임라인 로직 점검',
 'Sites 초기 템플릿의 app/ 및 components/는 데스크톱 빌드에서 사용하지 않습니다.',
 ''
].join('\n'));
