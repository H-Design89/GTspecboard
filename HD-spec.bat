@echo off
cd /d "%~dp0"

:: Kiem tra neu co file index.html thi mo luon
if exist "index.html" (
    start "" "index.html"
    exit
)

:: Neu file bi luu nham thanh .txt, he thong se tu dong sua ten lai cho dung
if exist "index.html.txt" (
    ren "index.html.txt" "index.html"
    start "" "index.html"
    exit
)

:: Neu file html ten la gi do khac (VD: search.html), he thong se tu tim va mo
if exist "*.html" (
    for %%f in (*.html) do (
        start "" "%%f"
        exit
    )
)

:: Neu khong co file HTML nao ton tai, dung man hinh lai va bao cao
color 0C
echo ========================================================
echo LỖI: KHÔNG TÌM THẤY BẤT KỲ FILE GIAO DIỆN (.HTML) NÀO!
echo ========================================================
echo.
echo Dưới đây là danh sách tên thật của các file đang nằm cùng
echo thư mục với file khởi động này:
echo --------------------------------------------------------
dir /b
echo --------------------------------------------------------
echo.
echo Anh hãy kiểm tra xem file giao diện của mình đang mang
echo tên thật là gì ở danh sách trên.
echo.
pause