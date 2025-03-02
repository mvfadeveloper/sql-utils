"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlUtils = void 0;
const postgres_1 = __importDefault(require("postgres"));
class SqlUtils {
    constructor(connectionString) {
        this.sql = (0, postgres_1.default)(connectionString, { max: 10 });
    }
    async getSingleObj(table, queryParam, queryValue) {
        try {
            const select = await this.sql `select * from ${this.sql(table)} where ${this.sql(queryParam)} = ${queryValue}`;
            if (select.count > 0) {
                return { success: true, value: select[0] };
            }
            return { success: false, error: "No data" };
        }
        catch (error) {
            const err = `Failed to get data from table(${table}): ${queryValue}`;
            console.error(err);
            return {
                success: false,
                error: err,
            };
        }
    }
    async getAllObjs(table, options) {
        try {
            const select = await this.sql `
        SELECT * FROM ${this.sql(table)} ${options?.queryParam
                ? this.sql `WHERE ${this.sql(options.queryParam)} = ${options.queryValue}`
                : this.sql ``}
      `;
            return {
                success: true,
                value: select,
            };
        }
        catch (error) {
            const err = `Failed to get data from table(${table}-${options?.queryValue}): ${error}`;
            console.error(err);
            return { success: false, error: err };
        }
    }
    async getAllObjsPaginated(table, options) {
        try {
            const page = options?.page || 1;
            const pageSize = options?.pageSize || 10;
            const offset = (page - 1) * pageSize;
            // Get total count for pagination
            const count = await this.sql `
          SELECT COUNT(*) FROM ${this.sql(table)} ${options?.queryParam
                ? this.sql `WHERE ${this.sql(options.queryParam)} = ${options.queryValue}`
                : this.sql ``}
        `;
            const total = Number(count[0].count);
            const pageCount = Math.ceil(total / pageSize);
            // Get paginated data
            const select = await this.sql `
          SELECT * FROM ${this.sql(table)} ${options?.queryParam
                ? this.sql `WHERE ${this.sql(options.queryParam)} = ${options.queryValue}`
                : this.sql ``} 
          ORDER BY id
          LIMIT ${pageSize} OFFSET ${offset}
        `;
            return {
                success: true,
                value: {
                    data: select,
                    total,
                    pageCount,
                },
            };
        }
        catch (error) {
            const err = `Failed to get data from table(${table}-${options?.queryValue}): ${error}`;
            console.error(err);
            return { success: false, error: err };
        }
    }
    async updateSingleColumn(table, column, value, idQuery, idColumn = "id") {
        try {
            const updatedRow = await this.sql `update ${this.sql(table)} set ${this.sql(column)} = ${value}, updated_at = now() where ${this.sql(idColumn)} = ${idQuery} returning *`;
            if (updatedRow.count > 0) {
                return { success: true, value: updatedRow[0] };
            }
            return { success: false, error: "No data" };
        }
        catch (error) {
            const err = `Updating ${table}(${column}) failed: ${error}`;
            console.error(err);
            return { success: false, error: err };
        }
    }
    async updateData(table, updateData, idQuery, idColumn = "id") {
        try {
            const setClauses = [];
            for (const column in updateData) {
                if (updateData.hasOwnProperty(column)) {
                    setClauses.push(this.sql `${this.sql(column)} = ${updateData[column]},`);
                }
            }
            const query = await this.sql `
          UPDATE ${this.sql(table)}
          SET ${setClauses} updated_at = now()
          WHERE ${this.sql(idColumn)} = ${idQuery}
          RETURNING *
        `;
            if (query.length > 0) {
                return { success: true, value: query[0] };
            }
            return { success: false, error: "No data" };
        }
        catch (error) {
            const err = `Updating ${table} failed: ${error}`;
            console.error(err);
            return { success: false, error: err };
        }
    }
    async deleteSingleRow(table, id) {
        try {
            await this.sql `delete from ${this.sql(table)} where id = ${id}`;
            return { success: true, value: undefined };
        }
        catch (error) {
            const err = `Deleting ${table}(${id}) failed: ${error}`;
            console.error(err);
            return { success: false, error: err };
        }
    }
    async insertData(table, insertData) {
        try {
            const columns = [];
            const values = [];
            let isFirst = true; // Track if it's the first element
            for (const column in insertData) {
                if (insertData.hasOwnProperty(column)) {
                    if (!isFirst) {
                        columns.push(this.sql `, ${this.sql(column)}`);
                        values.push(this.sql `, ${insertData[column]}`);
                    }
                    else {
                        columns.push(this.sql `${this.sql(column)}`);
                        values.push(this.sql `${insertData[column]}`);
                        isFirst = false;
                    }
                }
            }
            const query = await this.sql `
          INSERT INTO ${this.sql(table)} (${columns})
          VALUES (${values})
          RETURNING *
        `;
            if (query.length > 0) {
                return { success: true, value: query[0] };
            }
            return { success: false, error: "No data returned" };
        }
        catch (error) {
            const err = `Inserting into ${table} failed: ${error}`;
            console.error(err);
            return { success: false, error: err };
        }
    }
}
exports.SqlUtils = SqlUtils;
