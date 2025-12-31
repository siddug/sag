-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phraseHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AIGameTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gameType" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "scoringInstructions" TEXT,
    "initialScore" INTEGER NOT NULL DEFAULT 0,
    "apiKeys" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIGameTemplate_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AIGameSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "playerName" TEXT,
    "currentScore" INTEGER NOT NULL DEFAULT 0,
    "chatHistory" TEXT NOT NULL DEFAULT '[]',
    "isFrozen" BOOLEAN NOT NULL DEFAULT false,
    "shareId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIGameSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AIGameTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImpostersGame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teams" TEXT NOT NULL,
    "questionPairs" TEXT NOT NULL,
    "participantsPerTeam" INTEGER NOT NULL,
    "votersPerTeam" INTEGER NOT NULL,
    "currentMode" TEXT NOT NULL DEFAULT 'signup',
    "currentQuestion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImpostersGame_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImpostersParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "hasFakeQuestion" BOOLEAN NOT NULL DEFAULT false,
    "answer" TEXT,
    "questionNumber" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImpostersParticipant_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "ImpostersGame" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImpostersVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "voterId" TEXT NOT NULL,
    "votedForId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImpostersVote_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "ImpostersGame" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ImpostersVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "ImpostersParticipant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ImpostersVote_votedForId_fkey" FOREIGN KEY ("votedForId") REFERENCES "ImpostersParticipant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScoreTrackerGame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teams" TEXT NOT NULL,
    "scoreHistory" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScoreTrackerGame_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_phraseHash_key" ON "Admin"("phraseHash");

-- CreateIndex
CREATE UNIQUE INDEX "AIGameSession_shareId_key" ON "AIGameSession"("shareId");
