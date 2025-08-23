| table_name         | column_name     | data_type                   | is_nullable |
| ------------------ | --------------- | --------------------------- | ----------- |
| recording_comments | id              | bigint                      | NO          |
| recording_comments | recording_id    | text                        | NO          |
| recording_comments | session_id      | text                        | YES         |
| recording_comments | comment         | text                        | NO          |
| recording_comments | created_at      | timestamp with time zone    | YES         |
| recording_comments | updated_at      | timestamp with time zone    | YES         |
| shared_lessons     | session_id      | text                        | NO          |
| shared_lessons     | set_name        | text                        | NO          |
| shared_lessons     | set_description | text                        | YES         |
| shared_lessons     | recording_count | smallint                    | YES         |
| shared_lessons     | files           | jsonb                       | YES         |
| shared_lessons     | created_at      | timestamp without time zone | YES         |