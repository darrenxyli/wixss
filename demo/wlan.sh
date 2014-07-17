# config phishing adapter
ifconfig wlan0 10.33.0.1

# start DHCP
/etc/init.d/isc-dhcp-server restart

# start AP
hostapd ap.conf
