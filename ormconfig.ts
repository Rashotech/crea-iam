import { dataSourceOptions } from "src/config/data-source-options";
import { DataSource } from "typeorm";

console.log("Initializing data source with options:", dataSourceOptions);
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;