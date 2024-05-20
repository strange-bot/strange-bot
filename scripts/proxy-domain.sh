#!/bin/bash

DOMAIN=$1
PORT=$2

if [ $# -ne 2 ]; then
    echo "Usage: $0 <DOMAIN> <PORT>"
    exit 1
fi

NGINX_SITES_AVAILABLE_DIR="/etc/nginx/sites-available"
NGINX_SITES_ENABLED_DIR="/etc/nginx/sites-enabled"

# Fetch the IP address from eth0 interface
IP=$(ifconfig eth0 | grep 'inet ' | awk '{print $2}')

if [ -z "$IP" ]; then
    echo "Failed to retrieve IP address for eth0 interface."
    exit 1
fi

# Function to perform rollback
rollback() {
    echo "Rolling back changes..."

    if [ -f "$NGINX_SITES_AVAILABLE_DIR/$DOMAIN.conf" ]; then
        sudo rm "$NGINX_SITES_AVAILABLE_DIR/$DOMAIN.conf"
    fi

    if [ -f "$NGINX_SITES_ENABLED_DIR/$DOMAIN.conf" ]; then
        sudo rm "$NGINX_SITES_ENABLED_DIR/$DOMAIN.conf"
    fi
    
    echo "Rollback complete."
    exit 1
}

# Check if Certbot is installed, if not, install it
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    sudo apt-get update
    sudo apt-get install certbot python3-certbot-nginx
    if [ $? -ne 0 ]; then
        echo "Failed to install Certbot."
        rollback
    else
        echo "Certbot installed successfully."
    fi
fi

# Create the Nginx configuration file
cat <<EOF | sudo tee "$NGINX_SITES_AVAILABLE_DIR/$DOMAIN.conf" > /dev/null
server {
    server_name $DOMAIN;
    location / {
        proxy_pass http://$IP:$PORT;
        proxy_buffering off;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header Host \$host;
    }
}
EOF

echo "Nginx configuration file created: $NGINX_SITES_AVAILABLE_DIR/$DOMAIN.conf"

# Enable the site by creating a symbolic link to sites-enabled if it doesn't already exist
if [ ! -e "$NGINX_SITES_ENABLED_DIR/$DOMAIN.conf" ]; then
    sudo ln -s "$NGINX_SITES_AVAILABLE_DIR/$DOMAIN.conf" "$NGINX_SITES_ENABLED_DIR/$DOMAIN.conf"
    if [ $? -ne 0 ]; then
        echo "Failed to enable site."
        rollback
    else
        echo "Site enabled successfully."
    fi
else
    echo "Symbolic link already exists in $NGINX_SITES_ENABLED_DIR. Skipping creation."
fi

# Obtain SSL/TLS certificate using Certbot
echo "Obtaining SSL/TLS certificate using Certbot..."
sudo certbot --nginx -d "$DOMAIN"
if [ $? -ne 0 ]; then
    echo "Failed to obtain SSL/TLS certificate using Certbot."
    rollback
else
    echo "SSL/TLS certificate obtained successfully."
fi

# Check Nginx configuration syntax
sudo nginx -t
if [ $? -ne 0 ]; then
    echo "Nginx configuration syntax is invalid."
    rollback
else
    echo "Nginx configuration syntax is valid."
fi


# Restart Nginx
sudo systemctl restart nginx
if [ $? -ne 0 ]; then
    echo "Failed to restart Nginx."
    rollback
else
    echo "Nginx restarted successfully."
fi
