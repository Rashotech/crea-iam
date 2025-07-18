import { dataSourceOptions } from "src/config/data-source-options";
import { DataSource } from "typeorm";

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;