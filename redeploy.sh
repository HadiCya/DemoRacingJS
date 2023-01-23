git pull
pm2 delete all
pm2 start server.js
pm2 startup systemd
sudo env PATH=$PATH:/usr/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u hadi --hp /home/hadi
systemctl status pm2-hadi
