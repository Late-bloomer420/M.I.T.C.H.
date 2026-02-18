# Truth Import Payload Schema (Drag/Drop v1)

```json
{
  "version": "1.0",
  "scope": "MINDMAP",
  "items": [
    {
      "sourceType": "text|agent_conversation|transcript|video_transcript",
      "sourceId": "string",
      "sourceRef": "optional string",
      "text": "raw input text",
      "contextTags": ["optional", "tags"]
    }
  ]
}
```

## Notes

- `text` is parsed by the current v1 extractor (`<subject> is <object>` lines).
- Each item is persisted as claim rows with provenance.
- This payload is designed for drag/drop UI imports and can be produced by export adapters later.
