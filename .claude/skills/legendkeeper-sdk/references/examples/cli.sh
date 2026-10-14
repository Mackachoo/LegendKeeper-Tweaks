npx @legendkeeper/sdk --help
npx @legendkeeper/sdk resources --help
npx @legendkeeper/sdk projects list --pretty
npx @legendkeeper/sdk resources list --query.limit 5 --paginate

created=$(npx @legendkeeper/sdk resources create --body '{"name":"The Tree Fort","tags":["Home"]}')
id=$(node -p 'JSON.parse(process.argv[1]).id' "$created")
npx @legendkeeper/sdk resources update --resourceId "$id" --body '{"name":"Finn and Jake’s Tree Fort"}'
npx @legendkeeper/sdk resources get --resourceId "$id" --pretty
npx @legendkeeper/sdk resources delete --resourceId "$id"
