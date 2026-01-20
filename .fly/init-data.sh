#!/bin/sh
# Initialize data.json and photos on Fly.io from repo defaults
# This script runs on the Fly.io machine to initialize ephemeral storage

DATA_DIR="${DATA_DIR:-/tmp/app-data}"
INIT_DATA_FILE="/app/.fly/default-data.json"
INIT_PHOTOS_DIR="/app/.fly/default-photos"

echo "🚀 Initializing data on Fly.io..."
echo "   Data directory: $DATA_DIR"

# Create directories
mkdir -p "$DATA_DIR/photos"

# Copy default data.json if it exists and target doesn't exist
if [ -f "$INIT_DATA_FILE" ] && [ ! -f "$DATA_DIR/data.json" ]; then
  echo "📋 Copying default data.json..."
  cp "$INIT_DATA_FILE" "$DATA_DIR/data.json"
  echo "✅ data.json initialized"
else
  if [ -f "$DATA_DIR/data.json" ]; then
    echo "ℹ️  data.json already exists, skipping"
  else
    echo "⚠️  No default data.json found, creating empty one"
    cat > "$DATA_DIR/data.json" << 'EOF'
{
  "users": [],
  "groups": [],
  "apartments": [],
  "logs": []
}
EOF
  fi
fi

# Copy default photos if they exist
if [ -d "$INIT_PHOTOS_DIR" ] && [ "$(ls -A $INIT_PHOTOS_DIR 2>/dev/null)" ]; then
  echo "📸 Copying default photos..."
  cp -r "$INIT_PHOTOS_DIR"/* "$DATA_DIR/photos/" 2>/dev/null || true
  echo "✅ Photos initialized ($(ls -1 "$DATA_DIR/photos" | wc -l) files)"
else
  echo "ℹ️  No default photos found"
fi

echo "✅ Initialization complete!"
ls -lh "$DATA_DIR"
