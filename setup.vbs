Set objShell = WScript.CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Lấy đường dẫn thư mục hiện tại đang chứa file VBS
strCurrentFolder = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Lấy đường dẫn màn hình Desktop
strDesktop = objShell.SpecialFolders("Desktop")

' Tạo shortcut tên GT-SpecBoard.lnk ngoài Desktop
Set objShortcut = objShell.CreateShortcut(strDesktop & "\GT-SpecBoard.lnk")

' Trỏ mục tiêu chạy vào file index.html
objShortcut.TargetPath = strCurrentFolder & "\index.html"

' Cấp quyền thư mục làm việc (để file HTML đọc được data.js)
objShortcut.WorkingDirectory = strCurrentFolder

' Cài đặt hình ảnh Icon (Bắt buộc phải có file logo Gt.ico trong thư mục)
objShortcut.IconLocation = strCurrentFolder & "\logo-Gt.ico"

' Lưu shortcut
objShortcut.Save

MsgBox "Da tao thanh cong Shortcut GT-SpecBoard ra Desktop!", vbInformation, "H-DESIGN"