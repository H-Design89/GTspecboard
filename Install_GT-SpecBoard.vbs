Set objShell = WScript.CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get current folder
strCurrentFolder = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Target permanent icon folder: C:\Users\Public\GTSpecBoard
strPublicFolder = objShell.ExpandEnvironmentStrings("%PUBLIC%")
strIconDir = strPublicFolder & "\GTSpecBoard"

' Create folder if not exists
If Not objFSO.FolderExists(strIconDir) Then
    objFSO.CreateFolder(strIconDir)
End If

' Copy icon to the safe directory
strSourceIcon = strCurrentFolder & "\logo-Gt.ico"
strDestIcon = strIconDir & "\logo-Gt.ico"

If objFSO.FileExists(strSourceIcon) Then
    objFSO.CopyFile strSourceIcon, strDestIcon, True
Else
    MsgBox "Loi: Khong tim thay file logo-Gt.ico trong thu muc hien tai. Vui long GIAI NEN toan bo file tai ve ra mot thu muc roi moi chay!", 16, "H-DESIGN"
    WScript.Quit
End If

' Create Desktop Shortcut
strDesktop = objShell.SpecialFolders("Desktop")
Set objShortcut = objShell.CreateShortcut(strDesktop & "\GT-SpecBoard.lnk")

' Target Chrome or Edge
strChrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
strChrome86 = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
strEdge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

strTargetURL = "https://h-design89.github.io/GTspecboard/"

If objFSO.FileExists(strChrome) Then
    objShortcut.TargetPath = strChrome
    objShortcut.Arguments = "--app=""" & strTargetURL & """"
ElseIf objFSO.FileExists(strChrome86) Then
    objShortcut.TargetPath = strChrome86
    objShortcut.Arguments = "--app=""" & strTargetURL & """"
ElseIf objFSO.FileExists(strEdge) Then
    objShortcut.TargetPath = strEdge
    objShortcut.Arguments = "--app=""" & strTargetURL & """"
Else
    ' Fallback to default browser
    objShortcut.TargetPath = strTargetURL
End If

' Set Icon from the safe directory
objShortcut.IconLocation = strDestIcon

' Maximize window
objShortcut.WindowStyle = 3

objShortcut.Save

MsgBox "Da tao thanh cong loi tat GT-SpecBoard ra man hinh Desktop!" & vbCrLf & "Ban co the xoa thu muc tai ve nay.", 64, "H-DESIGN"
