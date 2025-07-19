import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateAppointmentEntity1752942684529 implements MigrationInterface {
    name = 'UpdateAppointmentEntity1752942684529'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_01733651151c8a1d6d980135cc4"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "scheduledDate"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD "appointmentDate" date NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD "appointmentTime" TIME NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD "patientId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_13c2e57cb81b44f062ba24df57d" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_13c2e57cb81b44f062ba24df57d"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "patientId"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "appointmentTime"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "appointmentDate"`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD "userId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD "scheduledDate" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_01733651151c8a1d6d980135cc4" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
