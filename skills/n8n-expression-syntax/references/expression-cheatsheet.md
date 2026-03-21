# Expression Cheatsheet

## Use Expressions For

- dynamic field mapping
- cross-node references
- timestamps and environment lookups

## Common Forms

```javascript
{
  {
    $json.field;
  }
}
{
  {
    $json.body.email;
  }
}
{
  {
    $node['Node Name'].json.value;
  }
}
{
  {
    $now.toFormat('yyyy-MM-dd');
  }
}
{
  {
    $env.MY_ENV_VAR;
  }
}
```

## Remember

- node names are case-sensitive
- names with spaces need bracket notation
- webhook payload data often lives under `$json.body`

## Do Not Use Expressions For

- live credential values
- static webhook path definitions
- Code node JavaScript logic
