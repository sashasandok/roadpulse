import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1790726400000 implements MigrationInterface {
  name = 'InitSchema1790726400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "vehicles" (
        "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
        "number"     VARCHAR     NOT NULL,
        "model"      VARCHAR     NOT NULL,
        "driver"     VARCHAR     NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vehicles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vehicles_number" UNIQUE ("number")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "telemetry_points" (
        "id"          UUID           NOT NULL DEFAULT gen_random_uuid(),
        "vehicle_id"  UUID           NOT NULL,
        "latitude"    DECIMAL(9,6)   NOT NULL,
        "longitude"   DECIMAL(9,6)   NOT NULL,
        "speed"       DECIMAL(6,2)   NOT NULL,
        "fuel"        DECIMAL(5,2)   NOT NULL,
        "ignition"    BOOLEAN        NOT NULL,
        "recorded_at" TIMESTAMPTZ    NOT NULL,
        "created_at"  TIMESTAMPTZ    NOT NULL DEFAULT now(),
        CONSTRAINT "PK_telemetry_points" PRIMARY KEY ("id"),
        CONSTRAINT "FK_telemetry_points_vehicle"
          FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_telemetry_points_vehicle_recorded"
        ON "telemetry_points" ("vehicle_id", "recorded_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_telemetry_points_vehicle_recorded"`);
    await queryRunner.query(`DROP TABLE "telemetry_points"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
  }
}
