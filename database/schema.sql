CREATE DATABASE IF NOT EXISTS `closing_todo`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `closing_todo`;

CREATE TABLE IF NOT EXISTS `staff` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_staff_name` (`name`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `icon` VARCHAR(50) NOT NULL DEFAULT 'Store',
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_category_name` (`name`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` VARCHAR(64) NOT NULL,
  `category_id` VARCHAR(64) NOT NULL,
  `text` VARCHAR(255) NOT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tasks_category_active` (`category_id`, `active`),
  CONSTRAINT `fk_tasks_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `closing_reports` (
  `id` VARCHAR(64) NOT NULL,
  `closing_date` DATE NOT NULL,
  `staff_id` VARCHAR(64) NOT NULL,
  `staff_name` VARCHAR(150) NOT NULL,
  `submit_time` TIME NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reports_date` (`closing_date`),
  KEY `idx_reports_staff` (`staff_id`),
  CONSTRAINT `fk_reports_staff`
    FOREIGN KEY (`staff_id`) REFERENCES `staff` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `closing_report_tasks` (
  `report_id` VARCHAR(64) NOT NULL,
  `task_id` VARCHAR(64) NOT NULL,
  `task_text` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`report_id`, `task_id`),
  CONSTRAINT `fk_report_tasks_report`
    FOREIGN KEY (`report_id`) REFERENCES `closing_reports` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT `fk_report_tasks_task`
    FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `closing_report_photos` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `report_id` VARCHAR(64) NOT NULL,
  `image_url` TEXT NULL,
  `view_url` TEXT NULL,
  `local_url` MEDIUMTEXT NULL,
  `photo_time` TIME NOT NULL,
  `uploaded` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_photos_report` (`report_id`),
  CONSTRAINT `fk_report_photos_report`
    FOREIGN KEY (`report_id`) REFERENCES `closing_reports` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO `staff` (`id`, `name`) VALUES
  ('staff-1', 'Ahmad Fauzi'),
  ('staff-2', 'Vemas'),
  ('staff-3', 'Fahreza'),
  ('staff-4', 'Nanda')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `categories` (`id`, `name`, `icon`, `active`) VALUES
  ('dapur', 'dapur & kebersihan', 'ChefHat', 1),
  ('depan', 'area depan (front of house)', 'Store', 1),
  ('kasir', 'kasir & keamanan', 'ReceiptText', 1)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `icon` = VALUES(`icon`);

INSERT INTO `tasks` (`id`, `category_id`, `text`, `active`) VALUES
  ('task-1', 'dapur', 'Bersihkan Exhaust & Grill', 1),
  ('task-2', 'dapur', 'Pel Lantai Area Basah', 1),
  ('task-3', 'dapur', 'Cek Suhu Freezer (-18°C)', 1),
  ('task-4', 'dapur', 'Buang Sampah Organik', 1),
  ('task-5', 'depan', 'Lap Meja Pelanggan', 1),
  ('task-6', 'depan', 'Matikan AC & Musik', 1),
  ('task-7', 'kasir', 'Print Laporan Settlement', 1),
  ('task-8', 'kasir', 'Kunci Pintu Utama', 1)
ON DUPLICATE KEY UPDATE
  `category_id` = VALUES(`category_id`),
  `text` = VALUES(`text`);
