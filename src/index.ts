import postgres, { PendingQuery, Row, Sql } from "postgres";

export type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

export interface InputData {
  [column: string]: string | string[] | number | boolean | null;
}

export class SqlUtils {
  private sql: Sql;

  constructor(connectionString: string) {
    this.sql = postgres(connectionString, { max: 10 });
  }

  async getSingleObj<T>(
    table: string,
    queryParam: string,
    queryValue: string | number | boolean
  ): Promise<Result<T, string>> {
    try {
      const select = await this.sql`select * from ${this.sql(
        table
      )} where ${this.sql(queryParam)} = ${queryValue}`;

      if (select.count > 0) {
        return { success: true, value: select[0] as T };
      }

      return { success: false, error: "No data" };
    } catch (error) {
      const err = `Failed to get data from table(${table}): ${queryValue}`;
      console.error(err);

      return {
        success: false,
        error: err,
      };
    }
  }

  async getAllObjs<T>(
    table: string,
    options?: {
      queryParam?: string;
      queryValue?: string | number | boolean;
      limit?: number;
      order?: "ASC" | "DESC";
    }
  ): Promise<Result<T, string>> {
    try {
      const select = await this.sql`
        SELECT * FROM ${this.sql(table)} 
        ${
          options?.queryParam
            ? this.sql`WHERE ${this.sql(
                options.queryParam
              )} = ${options.queryValue!}`
            : this.sql``
        }
        ${
          options?.order
            ? options.order === "DESC"
              ? this.sql`ORDER BY id DESC`
              : this.sql`ORDER BY id ASC`
            : this.sql``
        }
        ${options?.limit ? this.sql`LIMIT ${options.limit}` : this.sql``}; 
      `;

      return {
        success: true,
        value: select as T,
      };
    } catch (error) {
      const err = `Failed to get data from table(${table}-${options?.queryValue}): ${error}`;
      console.error(err);

      return { success: false, error: err };
    }
  }

  async getAllObjsPaginated<T>(
    table: string,
    options?: {
      queryParam?: string;
      queryValue?: string | number | boolean;
      page?: number;
      pageSize?: number;
    }
  ): Promise<Result<{ data: T; total: number; pageCount: number }, string>> {
    try {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 10;
      const offset = (page - 1) * pageSize;

      // Get total count for pagination
      const count = await this.sql`
          SELECT COUNT(*) FROM ${this.sql(table)} ${
        options?.queryParam
          ? this.sql`WHERE ${this.sql(
              options.queryParam
            )} = ${options.queryValue!}`
          : this.sql``
      }
        `;

      const total = Number(count[0].count);
      const pageCount = Math.ceil(total / pageSize);

      // Get paginated data
      const select = await this.sql`
          SELECT * FROM ${this.sql(table)} ${
        options?.queryParam
          ? this.sql`WHERE ${this.sql(
              options.queryParam
            )} = ${options.queryValue!}`
          : this.sql``
      } 
          ORDER BY id
          LIMIT ${pageSize} OFFSET ${offset}
        `;

      return {
        success: true,
        value: {
          data: select as T,
          total,
          pageCount,
        },
      };
    } catch (error) {
      const err = `Failed to get data from table(${table}-${options?.queryValue}): ${error}`;
      console.error(err);

      return { success: false, error: err };
    }
  }

  async updateSingleColumn<T>(
    table: string,
    column: string,
    value: string | string[] | number | boolean | null,
    idQuery: number,
    idColumn: string | undefined = "id"
  ): Promise<Result<T, string>> {
    try {
      const updatedRow = await this.sql`update ${this.sql(
        table
      )} set ${this.sql(
        column
      )} = ${value}, updated_at = now() where ${this.sql(
        idColumn
      )} = ${idQuery} returning *`;

      if (updatedRow.count > 0) {
        return { success: true, value: updatedRow[0] as T };
      }

      return { success: false, error: "No data" };
    } catch (error) {
      const err = `Updating ${table}(${column}) failed: ${error}`;
      console.error(err);

      return { success: false, error: err };
    }
  }

  async updateData<T>(
    table: string,
    updateData: InputData,
    idQuery: number,
    idColumn: string = "id"
  ): Promise<Result<T, string>> {
    try {
      const setClauses: PendingQuery<Row[]>[] = [];
      for (const column in updateData) {
        if (updateData.hasOwnProperty(column)) {
          setClauses.push(
            this.sql`${this.sql(column)} = ${updateData[column]},`
          );
        }
      }

      const query = await this.sql`
          UPDATE ${this.sql(table)}
          SET ${setClauses} updated_at = now()
          WHERE ${this.sql(idColumn)} = ${idQuery}
          RETURNING *
        `;

      if (query.length > 0) {
        return { success: true, value: query[0] as T };
      }

      return { success: false, error: "No data" };
    } catch (error: any) {
      const err = `Updating ${table} failed: ${error}`;
      console.error(err);
      return { success: false, error: err };
    }
  }

  async deleteSingleRow(
    table: string,
    id: number
  ): Promise<Result<void, string>> {
    try {
      await this.sql`delete from ${this.sql(table)} where id = ${id}`;

      return { success: true, value: undefined };
    } catch (error) {
      const err = `Deleting ${table}(${id}) failed: ${error}`;
      console.error(err);

      return { success: false, error: err };
    }
  }

  async insertData<T>(
    table: string,
    insertData: InputData
  ): Promise<Result<T, string>> {
    try {
      const columns: PendingQuery<Row[]>[] = [];
      const values: PendingQuery<Row[]>[] = [];
      let isFirst = true; // Track if it's the first element

      for (const column in insertData) {
        if (insertData.hasOwnProperty(column)) {
          if (!isFirst) {
            columns.push(this.sql`, ${this.sql(column)}`);
            values.push(this.sql`, ${insertData[column]}`);
          } else {
            columns.push(this.sql`${this.sql(column)}`);
            values.push(this.sql`${insertData[column]}`);
            isFirst = false;
          }
        }
      }

      const query = await this.sql`
          INSERT INTO ${this.sql(table)} (${columns})
          VALUES (${values})
          RETURNING *
        `;

      if (query.length > 0) {
        return { success: true, value: query[0] as T };
      }

      return { success: false, error: "No data returned" };
    } catch (error: any) {
      const err = `Inserting into ${table} failed: ${error}`;
      console.error(err);
      return { success: false, error: err };
    }
  }
}
