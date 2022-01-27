安装：

 

 rpm -ivh jdk-8u191-linux-x64.rpm 

配置/etc/profile

#java
export JAVA_HOME=/usr/java/default
export PATH=$JAVA_HOME/bin:$PATH
export CLASSPATH=.:$JAVA_HOME/lib/dt.jar:$JAVA_HOME/lib/tools.jar

source /etc/profile

 
