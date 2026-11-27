#!/bin/sh

mkdir -p /usr/local/modules/_core_
cd /home/ai/app
cp ../rootfs/usr/local/modules/_core_/version.txt /usr/local/modules/_core_/version.txt
./lvgl.sh -b -c
touch translation.h
make
ln -sf /etc/systemd/system/hardware-app.service /etc/systemd/system/multi-user.target.wants/hardware-app.service

mkdir -p /usr/local/modules/apache2
cd /home/ai/moduleApache2
make
cd /home/ai/moduleIpApache2
make

mkdir -p /usr/local/modules/pam && echo -e "#!/bin/sh\nexit 0" > /usr/local/modules/pam/pam.sh && chmod a+x /usr/local/modules/pam/pam.sh
TT=`cat /etc/pam.d/common-auth`
cat > /etc/pam.d/common-auth <<EOF
auth [success=ignore default=1] pam_oath.so usersfile=/disk/admin/modules/pam/oath.txt
auth sufficient pam_exec.so /usr/local/modules/pam/pam.sh oath_success
auth sufficient /usr/local/modules/pam/pam_app.so
session optional pam_exec.so /usr/local/modules/pam/pam.sh
$TT
EOF
cd /home/ai/pam
make

ln -sf /etc/systemd/system/hardware-init.service /etc/systemd/system/sysinit.target.wants/hardware-init.service
ln -sf /etc/systemd/system/hardware-otg.service /etc/systemd/system/sysinit.target.wants/hardware-otg.service
