#!/bin/sh
curl -sf -X POST -H "X-Cleanup-Token: $CLEANUP_SECRET_TOKEN" http://schrammel:${APP_PORT:-3000}/api/cleanup-worst-songs
