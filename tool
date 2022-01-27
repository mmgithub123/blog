文件工具：

exiftool，官网：https://exiftool.org/

安装：

ansible engine -m yum -a "name=perl-Image-ExifTool"

ansible engine -m shell -a "which exiftool"
/usr/bin/exiftool

ansible engine -m shell -a "ls -lah /usr/bin/exiftool"
-rwxr-xr-x. 1 root root 301K Aug 24 14:50 /usr/bin/exiftool      755

 

 

 

trid，      官网：https://mark0.net/soft-trid-e.html

安装：

TrID linux x64 install script · GitHub

wget http://mark0.net/download/trid_linux_64.zip
unzip trid_linux_64.zip
wget http://mark0.net/download/triddefs.zip
unzip triddefs.zip
sudo mv trid triddefs.trd /usr/bin
chmod u+x /usr/bin/trid
ansible engine -m shell -a "chmod 755 /usr/bin/trid"

 

file （magic），官网：https://www.filemagic.com/en/

die/diec.sh  ，官网：https://hub.fastgit.org/horsicq/Detect-It-Easy  这是GitHub的镜像，原地址：https://github.com/horsicq/Detect-It-Easy
