import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAppointmentEntity1752941793935 implements MigrationInterface {
    name = 'AddAppointmentEntity1752941793935'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."appointments_type_enum" AS ENUM('consultation', 'checkup', 'therapy', 'vaccination', 'follow_up')`);
        await queryRunner.query(`CREATE TYPE "public"."appointments_status_enum" AS ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')`);
        await queryRunner.query(`CREATE TABLE "appointments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "scheduledDate" TIMESTAMP NOT NULL, "duration" integer NOT NULL DEFAULT '30', "type" "public"."appointments_type_enum" NOT NULL DEFAULT 'consultation', "status" "public"."appointments_status_enum" NOT NULL DEFAULT 'scheduled', "notes" text, "reason" text, "diagnosis" text, "treatment" text, "userId" uuid NOT NULL, CONSTRAINT "PK_4a437a9a27e948726b8bb3e36ad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_01733651151c8a1d6d980135cc4" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_01733651151c8a1d6d980135cc4"`);
        await queryRunner.query(`DROP TABLE "appointments"`);
        await queryRunner.query(`DROP TYPE "public"."appointments_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."appointments_type_enum"`);
    }

}
