CREATE TYPE "BoardVisibility" AS ENUM ('WORKSPACE', 'PRIVATE');

ALTER TABLE "boards"
ADD COLUMN "visibility" "BoardVisibility" NOT NULL DEFAULT 'WORKSPACE';
