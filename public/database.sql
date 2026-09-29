-- ========================================================
-- اسکریپت پایگاه‌داده ساختاریافته سامانه حضور و غیاب M.GAMMON
-- نگارش: ۲.۶.۰ (استانداردسازی کامل امنیت، کلیدهای خارجی و قیود جامع)
-- سازگار با MySQL 8.0+ و MariaDB 10.5+
-- ========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ۱. جدول شرکت و کارگاه‌های تابعه
CREATE TABLE IF NOT EXISTS `companies` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `address` TEXT NULL,
  `phone` VARCHAR(50) NULL,
  `office_lat` DECIMAL(10, 8) DEFAULT 36.37660,
  `office_lng` DECIMAL(11, 8) DEFAULT 59.50820,
  `allowed_gps_radius` INT DEFAULT 35,
  `qr_refresh_interval_sec` INT DEFAULT 30,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `chk_comp_coords` CHECK (`office_lat` BETWEEN -90 AND 90 AND `office_lng` BETWEEN -180 AND 180),
  CONSTRAINT `chk_comp_radius` CHECK (`allowed_gps_radius` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۲. جدول کارگاه‌ها
CREATE TABLE IF NOT EXISTS `workshops` (
  `id` VARCHAR(36) PRIMARY KEY,
  `company_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `lat` DECIMAL(10, 8) NOT NULL,
  `lng` DECIMAL(11, 8) NOT NULL,
  `allowed_radius_meters` INT DEFAULT 35,
  `address` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_ws_coords` CHECK (`lat` BETWEEN -90 AND 90 AND `lng` BETWEEN -180 AND 180),
  CONSTRAINT `chk_ws_radius` CHECK (`allowed_radius_meters` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۳. جدول شیفت‌های کاری
CREATE TABLE IF NOT EXISTS `shifts` (
  `id` VARCHAR(36) PRIMARY KEY,
  `company_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('MORNING', 'EVENING', 'NIGHT', 'FLEXIBLE') DEFAULT 'MORNING',
  `start_time` VARCHAR(5) NOT NULL,
  `end_time` VARCHAR(5) NOT NULL,
  `thursday_end_time` VARCHAR(5) DEFAULT '13:00',
  `break_duration_minutes` INT DEFAULT 60,
  `late_tolerance_minutes` INT DEFAULT 15,
  `early_exit_tolerance_minutes` INT DEFAULT 10,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_shift_break` CHECK (`break_duration_minutes` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۴. جدول پرونده پرسنل
CREATE TABLE IF NOT EXISTS `employees` (
  `id` VARCHAR(36) PRIMARY KEY,
  `company_id` VARCHAR(36) NOT NULL,
  `personal_code` VARCHAR(50) NOT NULL UNIQUE,
  `national_code` VARCHAR(10) NOT NULL UNIQUE,
  `first_name` VARCHAR(80) NOT NULL,
  `last_name` VARCHAR(80) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `department` VARCHAR(80) NOT NULL,
  `position` VARCHAR(80) NOT NULL,
  `workshop_id` VARCHAR(36) NOT NULL,
  `hire_date` VARCHAR(10) NOT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE') DEFAULT 'ACTIVE',
  `contract_type` ENUM('PERMANENT', 'PROBATIONARY', 'TEMPORARY') DEFAULT 'PERMANENT',
  `shift_id` VARCHAR(36) NOT NULL,
  `base_salary` BIGINT NOT NULL,
  `hourly_rate` BIGINT NOT NULL,
  `overtime_rate` DECIMAL(4, 2) DEFAULT 1.40,
  `remaining_leave_days` INT DEFAULT 26,
  `bank_account` VARCHAR(40) NULL,
  `card_number` VARCHAR(20) NULL,
  `sheba_number` VARCHAR(30) NULL,
  `is_confidential` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`),
  FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`),
  CONSTRAINT `chk_emp_salary` CHECK (`base_salary` >= 0 AND `hourly_rate` >= 0),
  CONSTRAINT `chk_emp_leave_days` CHECK (`remaining_leave_days` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۵. جدول کاربران و سطوح دسترسی (ارتباط با پرونده پرسنل)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `company_id` VARCHAR(36) NOT NULL,
  `username` VARCHAR(80) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `phone` VARCHAR(20) NULL,
  `role` ENUM('ADMIN', 'MANAGER', 'EMPLOYEE') DEFAULT 'EMPLOYEE',
  `employee_id` VARCHAR(36) NULL UNIQUE,
  `is_super_admin` BOOLEAN DEFAULT FALSE,
  `workshop_id` VARCHAR(36) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`workshop_id`) REFERENCES `workshops` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۶. جدول ترددها و حضور و غیاب
CREATE TABLE IF NOT EXISTS `attendance_records` (
  `id` VARCHAR(36) PRIMARY KEY,
  `employee_id` VARCHAR(36) NOT NULL,
  `date` VARCHAR(10) NOT NULL,
  `check_in_time` VARCHAR(8) NULL,
  `check_out_time` VARCHAR(8) NULL,
  `work_duration_minutes` INT DEFAULT 0,
  `late_minutes` INT DEFAULT 0,
  `early_exit_minutes` INT DEFAULT 0,
  `overtime_minutes` INT DEFAULT 0,
  `status` ENUM('PRESENT', 'LATE', 'EARLY_LEAVE', 'ABSENT', 'ON_LEAVE', 'HOLIDAY') DEFAULT 'PRESENT',
  `approval_status` ENUM('APPROVED', 'PENDING', 'REJECTED') DEFAULT 'APPROVED',
  `check_in_method` VARCHAR(30) DEFAULT 'QR_CODE',
  `check_out_method` VARCHAR(30) DEFAULT 'QR_CODE',
  `verified_lat` DECIMAL(10, 8) NULL,
  `verified_lng` DECIMAL(11, 8) NULL,
  `verified_workshop_id` VARCHAR(36) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`verified_workshop_id`) REFERENCES `workshops` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_att_duration` CHECK (`work_duration_minutes` >= 0),
  CONSTRAINT `chk_att_late` CHECK (`late_minutes` >= 0),
  CONSTRAINT `chk_att_overtime` CHECK (`overtime_minutes` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۷. جدول درخواست‌های مرخصی
CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id` VARCHAR(36) PRIMARY KEY,
  `employee_id` VARCHAR(36) NOT NULL,
  `type` ENUM('EARNED', 'HOURLY', 'UNPAID', 'MEDICAL') DEFAULT 'EARNED',
  `start_date` VARCHAR(10) NOT NULL,
  `end_date` VARCHAR(10) NOT NULL,
  `start_time` VARCHAR(8) NULL,
  `end_time` VARCHAR(8) NULL,
  `duration_days` INT NULL,
  `duration_hours` DECIMAL(4, 2) NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  `reviewed_by` VARCHAR(100) NULL,
  `reviewed_at` VARCHAR(20) NULL,
  `rejection_reason` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_leave_dates` CHECK (`start_date` <= `end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۸. جدول مساعده‌ها
CREATE TABLE IF NOT EXISTS `advance_requests` (
  `id` VARCHAR(36) PRIMARY KEY,
  `employee_id` VARCHAR(36) NOT NULL,
  `amount` BIGINT NOT NULL,
  `request_date` VARCHAR(10) NOT NULL,
  `repay_month` VARCHAR(7) NOT NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  `reviewed_by` VARCHAR(100) NULL,
  `reviewed_at` VARCHAR(20) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_advance_amount` CHECK (`amount` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۹. جدول حقوق و دستمزد (به انضمام حق اولاد child_allowance - رفع SQL-002)
CREATE TABLE IF NOT EXISTS `salary_records` (
  `id` VARCHAR(36) PRIMARY KEY,
  `employee_id` VARCHAR(36) NOT NULL,
  `month` VARCHAR(7) NOT NULL,
  `base_salary` BIGINT NOT NULL,
  `work_days` INT NOT NULL,
  `worked_hours` DECIMAL(6, 2) NOT NULL,
  `overtime_hours` DECIMAL(6, 2) DEFAULT 0,
  `overtime_amount` BIGINT DEFAULT 0,
  `bonuses_total` BIGINT DEFAULT 0,
  `penalties_total` BIGINT DEFAULT 0,
  `advances_total` BIGINT DEFAULT 0,
  `insurance_deduction` BIGINT NOT NULL,
  `tax_deduction` BIGINT NOT NULL,
  `housing_allowance` BIGINT DEFAULT 900000,
  `grocery_allowance` BIGINT DEFAULT 1400000,
  `child_allowance` BIGINT DEFAULT 0,
  `gross_salary` BIGINT NOT NULL,
  `net_salary` BIGINT NOT NULL,
  `status` ENUM('DRAFT', 'CALCULATED', 'PAID') DEFAULT 'DRAFT',
  `payment_date` VARCHAR(10) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_emp_month` (`employee_id`, `month`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_salary_net` CHECK (`net_salary` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۰. جدول پیام‌های درون‌سازمانی و اعلانات
CREATE TABLE IF NOT EXISTS `broadcast_messages` (
  `id` VARCHAR(36) PRIMARY KEY,
  `company_id` VARCHAR(36) NOT NULL,
  `sender_name` VARCHAR(100) NOT NULL,
  `recipient_type` ENUM('ALL', 'WORKSHOP_1', 'WORKSHOP_2', 'SELECTED') DEFAULT 'ALL',
  `title` VARCHAR(150) NOT NULL,
  `content` TEXT NOT NULL,
  `channel` ENUM('SMS', 'IN_APP', 'BOTH') DEFAULT 'IN_APP',
  `sent_at` VARCHAR(40) NOT NULL,
  `status` ENUM('QUEUED', 'SENT', 'DELIVERED', 'FAILED') DEFAULT 'SENT',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۱. جدول لاگ وقایع و امنیت (ارتباط با کاربر - رفع SQL-004)
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(36) PRIMARY KEY,
  `company_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `user_name` VARCHAR(100) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `resource` VARCHAR(80) NOT NULL,
  `details` TEXT NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۲. داده‌های اولیه و تنظیمات کارگاهی
INSERT INTO `companies` (`id`, `name`, `code`, `address`, `phone`, `office_lat`, `office_lng`, `allowed_gps_radius`, `qr_refresh_interval_sec`)
VALUES ('comp_mgommon_01', 'M.GAMMON', 'MG-101', 'مشهد، توس ۱۴۲، حسین زاده ۸', '۰۵۱-۳۶۹۰۹۰۹۰', 36.37660, 59.50820, 35, 30)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `workshops` (`id`, `company_id`, `name`, `code`, `lat`, `lng`, `allowed_radius_meters`, `address`)
VALUES 
('ws_1', 'comp_mgommon_01', 'کارگاه شماره یک (تولید و ماشین‌کاری)', 'WS-01', 36.37652, 59.50812, 35, 'مشهد، توس ۱۴۲، حسین زاده ۸، پلاک ۱۲'),
('ws_2', 'comp_mgommon_01', 'کارگاه شماره دو (مونتاژ و انبار)', 'WS-02', 36.37668, 59.50835, 35, 'مشهد، توس ۱۴۲، حسین زاده ۸، پلاک ۱۸')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `shifts` (`id`, `company_id`, `name`, `type`, `start_time`, `end_time`, `thursday_end_time`, `break_duration_minutes`, `late_tolerance_minutes`, `early_exit_tolerance_minutes`)
VALUES 
('shift_standard_day', 'comp_mgommon_01', 'شیفت استاندارد روزانه کارگاهی', 'MORNING', '07:00', '16:00', '13:00', 60, 15, 10),
('shift_evening_workshop', 'comp_mgommon_01', 'شیفت عصر و شب کارگاه', 'EVENING', '14:00', '22:00', '14:00', 45, 10, 10)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- نمونه استاندارد کاربر ارشد با پسورد هش‌شده امن (Argon2 / SHA-256)
-- رفع SQL-001 و AUTH-002
INSERT INTO `users` (`id`, `company_id`, `username`, `password_hash`, `name`, `email`, `phone`, `role`, `employee_id`, `is_super_admin`, `workshop_id`)
VALUES ('usr_admin', 'comp_mgommon_01', 'admin', '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$qU87aY8cR0LwQk157uL7b...', 'مجید نورایی', 'm.nouraei@mgommon.ir', '09151111111', 'ADMIN', NULL, TRUE, 'ws_1')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

SET FOREIGN_KEY_CHECKS = 1;
