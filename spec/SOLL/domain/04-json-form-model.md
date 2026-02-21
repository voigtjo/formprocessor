# JSON Form Model - P0

This defines how `field_defs_json`, `layout_json`, and `rules_json` are structured in P0.

## field_defs_json (array)
Each field definition:

```json
{
  "key": "product_id",
  "type": "string",
  "label": "Product",
  "semantic": "WRITABLE_ENTITY",
  "readonly": false,
  "required": true,
  "lookup": {
    "kind": "api",
    "url": "/api/products?valid=true",
    "valueField": "id",
    "labelField": "name"
  }
}
```

Constraints:
- `key` is unique in the array
- `type` is one of: `string`, `number`, `boolean`, `date`, `json`
- `semantic` is one of: `READONLY_EXTERNAL`, `WRITABLE_ENTITY`
- `lookup` is optional
- `lookup.kind` currently supports `api`

## layout_json (object)

```json
{
  "title": "Order Form",
  "sections": [
    {
      "title": "Main",
      "rows": [
        {
          "cols": [{ "field": "product_id" }]
        }
      ]
    }
  ]
}
```

Constraints:
- `sections[].rows[].cols[].field` must reference an existing `field_defs_json[].key`

## rules_json (array)
P0 stores rules but does not execute them. Keep as opaque JSON array.
