-- =============================================================
--  Sticker Finder — Création de la base de données et des tables
--  Compatible MariaDB >= 10.5
-- =============================================================

CREATE DATABASE IF NOT EXISTS sticker_finder
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sticker_finder;

-- -------------------------------------------------------------
-- Table : users
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  pseudo        VARCHAR(50)   NOT NULL,
  email         VARCHAR(190)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('user','admin') NOT NULL DEFAULT 'user',
  avatar_url    VARCHAR(255)  DEFAULT NULL,
  team          VARCHAR(50)   DEFAULT NULL,
  api_key       VARCHAR(64)   DEFAULT NULL,
  xp            INT UNSIGNED  NOT NULL DEFAULT 0,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_pseudo (pseudo),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_api_key (api_key)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Table : stickers
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stickers (
  id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED   NOT NULL,
  photo_url   VARCHAR(255)   NOT NULL,
  lat         DECIMAL(10, 7) NOT NULL,
  lng         DECIMAL(10, 7) NOT NULL,
  description VARCHAR(500)   DEFAULT NULL,
  created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_stickers_user (user_id),
  CONSTRAINT fk_stickers_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Table : likes  (clé primaire composite user_id + sticker_id)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS likes (
  user_id    INT UNSIGNED NOT NULL,
  sticker_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, sticker_id),
  KEY idx_likes_sticker (sticker_id),
  CONSTRAINT fk_likes_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_likes_sticker
    FOREIGN KEY (sticker_id) REFERENCES stickers (id)
    ON DELETE CASCADE
) ENGINE = InnoDB;