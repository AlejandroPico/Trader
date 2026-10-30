[Setup]
AppId={{737625B0-83A9-42E5-A7BD-8373E789F506}
AppName=Trader
AppVersion=0.1.0
AppPublisher=AlejandroPico
DefaultDirName={localappdata}\Programs\Trader
DefaultGroupName=Trader
PrivilegesRequired=lowest
OutputDir=..\release
OutputBaseFilename=Trader-Setup-0.1.0
SetupIconFile=..\public\icons\trader.ico
UninstallDisplayIcon={app}\Trader.exe
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\release\Trader\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Tasks]
Name: "desktopicon"; Description: "Crear un acceso directo en el escritorio"; Flags: unchecked

[Icons]
Name: "{group}\Trader"; Filename: "{app}\Trader.exe"
Name: "{autodesktop}\Trader"; Filename: "{app}\Trader.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\Trader.exe"; Description: "Abrir Trader"; Flags: nowait postinstall skipifsilent
