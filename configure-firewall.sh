#!/bin/bash
# Configure firewall for Rental App ports

echo "=== Configuring Firewall for Rental App ==="
echo ""

# Check if ufw is available
if command -v ufw &> /dev/null; then
    echo "Using UFW firewall..."
    
    # Allow backend API port
    sudo ufw allow 8083/tcp comment 'Rental App Backend API'
    echo "✅ Port 8083 (Backend API) allowed"
    
    # Allow frontend port
    sudo ufw allow 8084/tcp comment 'Rental App Frontend'
    echo "✅ Port 8084 (Frontend) allowed"
    
    # Show status
    echo ""
    echo "Current firewall status:"
    sudo ufw status numbered
    
elif command -v iptables &> /dev/null; then
    echo "Using iptables..."
    
    # Allow backend API port
    sudo iptables -I INPUT -p tcp --dport 8083 -j ACCEPT
    echo "✅ Port 8083 (Backend API) allowed"
    
    # Allow frontend port
    sudo iptables -I INPUT -p tcp --dport 8084 -j ACCEPT
    echo "✅ Port 8084 (Frontend) allowed"
    
    # Save rules (if iptables-persistent is installed)
    if command -v iptables-save &> /dev/null; then
        echo "Saving iptables rules..."
        sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null 2>&1 || echo "Note: Rules may not persist after reboot. Install iptables-persistent to save."
    fi
    
    echo ""
    echo "Current iptables rules for ports 8083 and 8084:"
    sudo iptables -L INPUT -n | grep -E "(8083|8084|target|Chain)" | head -10
    
else
    echo "❌ Neither ufw nor iptables found. Please install a firewall manager."
    exit 1
fi

echo ""
echo "=== Firewall Configuration Complete ==="
echo ""
echo "Ports now accessible:"
echo "  - 8083: Backend API (Express + Knex.js)"
echo "  - 8084: Frontend (Vite + React)"
echo ""
echo "Note: If using a cloud provider, you may also need to configure"
echo "      security groups/firewall rules in their console."
