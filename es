7.16版本新引入的东西，方便了很多，其实就是加了个控制面和agent，很多pass平台都这么做的。

以前，用logstash和beat系列，都是需要手动做各种配置和接入。

现在引入了fleet和Elastic Agent的概念。

fleet就是一个在kibana上的界面模块，可以做各种配置下发，下发给fleet server，而fleet server的后端存储用的就是es。

es agent部在各种主机端，然后可以从fleet获取到配置更新。这里有各种策略的配置。

overview文档在：https://www.elastic.co/guide/en/fleet/7.16/fleet-overview.html

 

Starting in version 7.14.0, Elastic Agent is generally available (GA).

 

从这个页面看，很多东西都不支持，生产暂时没法用：

https://www.elastic.co/guide/en/fleet/7.16/beats-agent-comparison.html

 

-----------------------------------------------------------------------------------------------------------------------------------------------------------

 

quickstart：

es

下载rpm

curl -L -O https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-7.16.2-x86_64.rpm
安装
sudo rpm -ivh elasticsearch-7.16.2-x86_64.rpm
默认的systemd service文件是type=notify的一直启动超时，改成了simple

如下：
# /usr/lib/systemd/system/elasticsearch.service
[Unit]
Description=Elasticsearch
Documentation=https://www.elastic.co
Wants=network-online.target
After=network-online.target

[Service]
#Type=notify   这里注释掉，默认就是simple
RuntimeDirectory=elasticsearch
PrivateTmp=true
Environment=ES_HOME=/usr/share/elasticsearch
Environment=ES_PATH_CONF=/etc/elasticsearch
Environment=PID_DIR=/var/run/elasticsearch
Environment=ES_SD_NOTIFY=true
EnvironmentFile=-/etc/sysconfig/elasticsearch

WorkingDirectory=/usr/share/elasticsearch

User=elasticsearch
Group=elasticsearch

ExecStart=/usr/share/elasticsearch/bin/systemd-entrypoint -p ${PID_DIR}/elasticsearch.pid --quiet

# StandardOutput is configured to redirect to journalctl since
# some error messages may be logged in standard output before
# elasticsearch logging system is initialized. Elasticsearch
# stores its logs in /var/log/elasticsearch and does not use
# journalctl by default. If you also want to enable journalctl
# logging, you can simply remove the "quiet" option from ExecStart.
StandardOutput=journal
StandardError=inherit

# Specifies the maximum file descriptor number that can be opened by this process
LimitNOFILE=65535

# Specifies the maximum number of processes
LimitNPROC=4096

# Specifies the maximum size of virtual memory
LimitAS=infinity

# Specifies the maximum file size
LimitFSIZE=infinity

# Disable timeout logic and wait until process is stopped
TimeoutStopSec=0

# SIGTERM signal is used to stop the Java process
KillSignal=SIGTERM

# Send the signal only to the JVM rather than its control group
KillMode=process

# Java process is never killed
SendSIGKILL=no

# When a JVM receives a SIGTERM signal it exits with code 143
SuccessExitStatus=143

# Allow a slow startup before the systemd notifier module kicks in to extend the timeout
#TimeoutStartSec=75

[Install]
WantedBy=multi-user.target

# Built for packages-7.16.2 (packages)


测试，安装成功：
curl http://127.0.0.1:9200
{
"name" : "test2",
"cluster_name" : "elasticsearch",
"cluster_uuid" : "gVxY1PUxTcOdZFuMp2tk-A",
"version" : {
"number" : "7.16.2",
。。。。。省略
"tagline" : "You Know, for Search"
}

打开远程访问，修改/etc 下es的配置：

network.host: 机器ip

discovery.seed_hosts: ["机器ip"]  （如果指定了network.host，这个配置就需要指定）

 

 


kibana：
install：
导入es PGP key
rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch
cat >>/etc/yum.repos.d/kibana.repo<<EOF
[kibana-7.x]
name=Kibana repository for 7.x packages
baseurl=https://artifacts.elastic.co/packages/7.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md
EOF


sudo yum install kibana

systemd service 文件：

# /etc/systemd/system/kibana.service
[Unit]
Description=Kibana
Documentation=https://www.elastic.co
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=kibana
Group=kibana

Environment=KBN_HOME=/usr/share/kibana
Environment=KBN_PATH_CONF=/etc/kibana

EnvironmentFile=-/etc/default/kibana
EnvironmentFile=-/etc/sysconfig/kibana

ExecStart=/usr/share/kibana/bin/kibana --logging.dest="/var/log/kibana/kibana.log" --pid.file="/run/kibana/kibana.pid"

Restart=on-failure
RestartSec=3

StartLimitBurst=3
StartLimitInterval=60

WorkingDirectory=/usr/share/kibana

StandardOutput=journal
StandardError=inherit

[Install]
WantedBy=multi-user.target


 systemctl daemon-reload
 systemctl enable kibana
 systemctl start kibana

很简单，所有的事情kibana yum都给做好了，包括systemd service文件。

安装后目录拓扑：

Type	Description	Default Location	Setting
home

Kibana home directory or $KIBANA_HOME

/usr/share/kibana

 
bin

Binary scripts including kibana to start the Kibana server and kibana-plugin to install plugins

/usr/share/kibana/bin

 
config

Configuration files including kibana.yml

/etc/kibana

KBN_PATH_CONF

data

The location of the data files written to disk by Kibana and its plugins

/var/lib/kibana

path.data

logs

Logs files location

/var/log/kibana

path.logs

plugins

Plugin files location. Each plugin will be contained in a subdirectory.

/usr/share/kibana/plugins

 
kibana  连es
elasticsearch.hosts: ["http://es的ip:9200"]

访问控制：
https://www.elastic.co/guide/en/elasticsearch/reference/7.16/security-minimal-setup.html
就上面这文档，挺绕的，基本是es自己的东西



filebeat:

install:
1,curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-7.16.2-x86_64.rpm
2,sudo rpm -vi filebeat-7.16.2-x86_64.rpm（装的时候，这里就应该sudo -u  filebeat）

安装完后，默认的systemd service文件 没有指定使用filebeat用户启动程序，需要加，如下：
sed -i '7 a User=filebeat\nGroup=filebeat' filebeat.service （在第七行后追加两行，这个第七行和文件强相关了）

[Unit]
Description=Filebeat sends log files to Logstash or directly to Elasticsearch.
Documentation=https://www.elastic.co/beats/filebeat
Wants=network-online.target
After=network-online.target

[Service]
User=filebeat（新加的）
Group=filebeat（新加的）
Environment="GODEBUG='madvdontneed=1'"
Environment="BEAT_LOG_OPTS="
Environment="BEAT_CONFIG_OPTS=-c /etc/filebeat/filebeat.yml"
Environment="BEAT_PATH_OPTS=--path.home /usr/share/filebeat --path.config /etc/filebeat --path.data /var/lib/filebeat --path.logs /var/log/filebeat"
ExecStart=/usr/share/filebeat/bin/filebeat --environment systemd $BEAT_LOG_OPTS $BEAT_CONFIG_OPTS $BEAT_PATH_OPTS
Restart=always

[Install]
WantedBy=multi-user.target

相应的，文件权限也不对，需要

 

配置

chown -R filebeat:filebeat  /etc/filebeat/filebeat.yml

chown -R filebeat:filebeat  /etc/filebeat/

数据文件

chown -R filebeat:filebeat /var/lib/filebeat/

主目录：

chown -R filebeat:filebeat  /usr/share/filebeat/

日志

mkdir -p /var/log/filebeat

chown -R filebeat:filebeat  /var/log/filebeat

 

当然事先建立filebeat用户和组也是必须的，

groupadd filebeat
useradd -r -g filebeat -s /sbin/nologin filebeat

 

3,配置文件：
查看配置文件编写的正确与否：
sudo -u filebeat filebeat test config  --path.config=/etc/filebeat（注意这里的filebeat二进制是/bin/filebeat  不是/usr/share/filebeat/bin/filebeat,
                                                                   这里有路径问题的大坑）

output.elasticsearch:
  hosts: ["myEShost:9200"]
username: "elastic"
password: "${ES_PWD}" （这里就是下一步指定的）


4，为配置文件设定密码：（https://www.elastic.co/guide/en/beats/filebeat/7.16/keystore.html）

The keystore command must be run by the same user who will run Filebeat.
Filebeat creates the keystore in the directory defined by the path.data configuration setting.
sudo -u filebeat filebeat keystore create 

（注意这里的filebeat二进制是/bin/filebeat  不是/usr/share/filebeat/bin/filebeat,
                                                                   这里有路径问题的大坑）

输出，Created filebeat keystore

sudo -u filebeat filebeat keystore  add ES_PWD  （添加）

sudo -u filebeat filebeat keystore  add ES_PWD  --force（--force选项可以覆盖，相当于修改密码）

sudo -u filebeat filebeat keystore  list    （列出查看）

配置kibana：

setup.kibana:
    host: "mykibanahost:5601"
用户名和密码，默认沿用es的。

5，配置日志采集模块
支持的日志采集模块：
sudo -u filebeat filebeat modules list  
chown -R filebeat:filebeat /etc/filebeat/  （这里权限要统一规划，或者安装rpm的时候，就指定sudo -u filebeat）
打开nginx mysql system模块
sudo -u filebeat filebeat modules enable system nginx mysql
配置nginx模块
vi /etc/filebeat/modules.d/nginx.yml
var.paths: [/var/log/nginx/access.log*]

启动创建es里的filebeat模板：
filebeat setup -e

troubleshooting：

1，Exiting: 1 error: error loading config file: invalid config: yaml: line 13: could not find expected ':'

nginx module 的nginx.yml配置里 : 后面少了一个空格（就是

var.paths: [/var/log/nginx/access.log*]
），yaml格式的文件对格式要求很严格。

 

 

2，有个bug吗？ ERROR   [modules]       fileset/modules.go:142  Not loading modules. Module directory not found: /usr/share/filebeat/bin/module
https://discuss.elastic.co/t/filebeat-changing-filebeats-path-for-its-configuration-module/236243
这个大坑还没有解决，kibana还看不到filebeat的数据，而且按url里在配置文件最上面指定path home，在
sudo -u filebeat /usr/share/filebeat/bin/filebeat keystore create --path.config=/etc/filebeat  这一步配置要一致，不然密码找不到。（这里的问题和下面大坑的解释都是一样的）
大坑的问题在这了：
# =================================== Paths ====================================

# The home path for the Filebeat installation. This is the default base path
# for all other path settings and for miscellaneous files that come with the
# distribution (for example, the sample dashboards).
# If not set by a CLI flag or in the configuration file, the default for the
# home path is the location of the binary.
#path.home: /etc/filebeat/filebeat.reference.yml  是全部配置。 /etc/filebeat/filebeat.yml是基本样例配置，默认Paths这些是不开启的。

所以当If not set by a CLI flag or in the configuration file, the default for the home path is the location of the binary.的时候就会出问题。

而出现大坑的根本原因是 rpm安装时,安装目录说明里没有提到/bin/filebeat半个字，而/bin/filebeat却时rpm安装的一个带启动路径的工具，

在 setup配置es模板的时候需要用，其实就是配置模板时指定上Paths那四个路径。


关于这个大坑，去es官方社区提了一个建议：
https://discuss.elastic.co/t/some-puzzle-about-filebeat-version7-x-rpm-installation/293312

about this topic，there are some discuss before，for example：
https://discuss.elastic.co/t/filebeat-changing-filebeats-path-for-its-configuration-module/236243
and
https://discuss.elastic.co/t/filebeat-configuration-module-path-issue/268871

but，the basic question is ，when we install filebeat use rpm follow this page ：https://www.elastic.co/guide/en/beats/filebeat/7.16/filebeat-installation-configuration.html use the command：
curl -L -O https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-7.16.2-x86_64.rpm
sudo rpm -vi filebeat-7.16.2-x86_64.rpm

the rpm will install a wrapper utils，in /bin directory。but there is nothing about this in our document about directory-layout in https://www.elastic.co/guide/en/beats/filebeat/7.16/directory-layout.html

so，a lot of people do not know this wrapper exist。

additional，in the quick start document ，see the pic：
![企业微信截图_20220103140529|379x500](upload://bofewKDFYsL9dZ16huWtcfPCTgf.png)

the filebeat program here is the /bin/filebeat , but a lot
of people will think it is /usr/share/filebeat/bin/filebeat .
because this two program have the same name，and there is no describe /bin/filebeat in the directory-layou document page https://www.elastic.co/guide/en/beats/filebeat/7.16/directory-layout.html


In summary，i suggest ：
1，in the directory-layou document page add the describe about utils program /bin/filebeat
or
2,change the utils program name，we can call it filebeat-utils,so
people will not puzzle with /usr/share/filebeat/bin/filebeat
3,add some describe in quick start，so the reader will know the filebeat in command line is used /bin/filebeat not /usr/share/filebeat/bin/filebeat

thinks.



 
The directory layout of an installation is as follows:

Type	Description	Default Location	Config Option
home

Home of the Filebeat installation.

 	
path.home

bin

The location for the binary files.

{path.home}/bin

 
config

The location for configuration files.

{path.home}

path.config

data

The location for persistent data files.

{path.home}/data

path.data

logs

The location for the logs created by Filebeat.

{path.home}/logs

path.logs

You can change these settings by using CLI flags or setting path options in the configuration file.

Default paths
Filebeat uses the following default paths unless you explicitly change them.

deb and rpm
 
 
Type	Description	Location
home

Home of the Filebeat installation.

/usr/share/filebeat

bin

The location for the binary files.

/usr/share/filebeat/bin

config

The location for configuration files.

/etc/filebeat

data

The location for persistent data files.

/var/lib/filebeat

logs

The location for the logs created by Filebeat.

/var/log/filebeat



-----------------------------------------------------------------------------------------------------------------------------------------


使用：
查询所有索引：
 curl -u elastic:密码 -XGET 'ip:9200/_cat/indices?v&pretty'

 curl -u elastic:密码  -H "Content-Type: application/json" -XPUT '192.168.100.159:9200/filebeat-7.16.2-2021.12.31-000001/_settings' -d '{"number_of_replicas":0}'
 curl -u elastic:密码  -H "Content-Type: application/json"（指定json类型） -XPUT '192.168.100.159:9200/filebeat-7.16.2-2021.12.31-000001/_settings' （指定put方法及uri） -d '{"number_of_replicas":0}' （-d指定数据）

 

curl -u elastic:密码 -H "Content-Type: application/json" -XPOST '192.168.100.159:9200/test/_doc' -d '{"test_consle":1}'   test索引 默认_doc类型

curl -u elastic: -XGET '192.168.100.159:9200/test/_search'  查询test索引

 ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

 

es安全：

https://www.elastic.co/guide/en/elasticsearch/reference/7.16/secure-cluster.html

https://www.elastic.co/guide/en/elasticsearch/reference/7.16/configuring-stack-security.html

 

产品级安装：

https://www.elastic.co/guide/en/elastic-stack/7.16/installing-elastic-stack.html
