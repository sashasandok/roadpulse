import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1790867856316 implements MigrationInterface {
  name = 'InitSchema1790867856316';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "vehicles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "number" character varying NOT NULL, "model" character varying NOT NULL, "driver" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1711b2a8a073926b48d72f7541a" UNIQUE ("number"), CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "alerts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying(20) NOT NULL, "message" text NOT NULL, "isRead" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "vehicleId" uuid, CONSTRAINT "PK_60f895662df096bfcdfab7f4b96" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fb3888269e2551c86ec7314a24" ON "alerts" ("vehicleId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "telemetry_points" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "latitude" numeric(9,6) NOT NULL, "longitude" numeric(9,6) NOT NULL, "speed" numeric(6,2) NOT NULL, "fuel" numeric(5,2) NOT NULL, "ignition" boolean NOT NULL, "recorded_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "vehicleId" uuid NOT NULL, CONSTRAINT "PK_6e6c64dbf13e26981c4fda7243e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ac06e6342600fe8eae5d7411cb" ON "telemetry_points" ("vehicleId", "recorded_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD CONSTRAINT "FK_991faffd317530d0661a1771c44" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "telemetry_points" ADD CONSTRAINT "FK_3f655eac5c73ee739a18782a454" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "telemetry_points" DROP CONSTRAINT "FK_3f655eac5c73ee739a18782a454"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP CONSTRAINT "FK_991faffd317530d0661a1771c44"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_ac06e6342600fe8eae5d7411cb"`);
    await queryRunner.query(`DROP TABLE "telemetry_points"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fb3888269e2551c86ec7314a24"`);
    await queryRunner.query(`DROP TABLE "alerts"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
  }
}
