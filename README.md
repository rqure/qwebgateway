# qwebgateway

Example of taking a database backup:

```
curl localhost:20000/api -d '{"header":{"id":"ea9e4bfb-a208-419e-88cc-8dc694b287ef","timestamp":"2024-07-04T22:37:18.544393318Z"},"payload":{"@type":"type.googleapis.com/qdb.WebConfigCreateSnapshotRequest"}}' | jq '.payload |= (del(.status) | .["@type"] = "type.googleapis.com/qdb.WebConfigRestoreSnapshotRequest")' > snapshot.json
```

Example of restoring a database backup:

```
curl localhost:20000/api -d @tmp/snapshot.json
```