-- ========================================================
-- اسکریپت دیتابیس سامانه حضور و غیاب و منابع انسانی M.GAMMON
-- نگارش: ۲.۵.۰
-- سازگار با MySQL 8.0+ و MariaDB
-- ========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ۱. جدول شرکت و تنظیمات اصلی
CREATE TABLE IF NOT EXISTS `companies` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `address` TEXT NULL,
  `phone` VARCHAR(50) NULL,
  `office_lat` DECIMAL(10, 8) DEFAULT 35.7575,
  `office_lng` DECIMAL(11, 8) DEFAULT 51.4100,
  `allowed_gps_radius` INT DEFAULT 20,
  `qr_refresh_interval_sec` INT DEFAULT 30,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۲. جدول کاربران و سطوح دسترسی
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `company_id` VARCHAR(36) NOT NULL,
  `username` VARCHAR(80) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `role` ENUM('ADMIN', 'MANAGER', 'EMPLOYEE') DEFAULT 'EMPLOYEE',
  `employee_id` VARCHAR(36) NULL UNIQUE,
  `refresh_token` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
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
  FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
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
  `hire_date` VARCHAR(10) NOT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE', 'ON_LEAVE') DEFAULT 'ACTIVE',
  `contract_type` ENUM('PERMANENT', 'PROBATIONARY', 'TEMPORARY') DEFAULT 'PERMANENT',
  `shift_id` VARCHAR(36) NOT NULL,
  `base_salary` BIGINT NOT NULL,
  `hourly_rate` BIGINT NOT NULL,
  `overtime_rate` DECIMAL(4, 2) DEFAULT 1.40,
  `remaining_leave_days` INT DEFAULT 26,
  `bank_account` VARCHAR(40) NULL,
  `sheba_number` VARCHAR(30) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۵. جدول ترددها
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
  `check_in_method` VARCHAR(30) DEFAULT 'QR_CODE',
  `check_out_method` VARCHAR(30) DEFAULT 'QR_CODE',
  `verified_lat` DECIMAL(10, 8) NULL,
  `verified_lng` DECIMAL(11, 8) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_emp_date` (`employee_id`, `date`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۶. جدول مرخصی‌ها
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
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۷. جدول مساعده‌ها
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
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۸. جدول حقوق و دستمزد
CREATE TABLE IF NOT EXISTS `salary_records` (
  `id` VARCHAR(36) PRIMARY KEY,
  `employee_id` VARCHAR(36) NOT NULL,
  `month` VARCHAR(7) NOT NULL,
  `base_salary` BIGINT NOT NULL,
  `work_days` INT NOT NULL,
  `worked_hours` DECIMAL(6, 2) NOT NULL,
  `overtime_hours` DECIMAL(5, 2) DEFAULT 0,
  `overtime_amount` BIGINT DEFAULT 0,
  `bonuses_total` BIGINT DEFAULT 0,
  `penalties_total` BIGINT DEFAULT 0,
  `advances_total` BIGINT DEFAULT 0,
  `insurance_deduction` BIGINT NOT NULL,
  `tax_deduction` BIGINT NOT NULL,
  `housing_allowance` BIGINT DEFAULT 900000,
  `grocery_allowance` BIGINT DEFAULT 1400000,
  `gross_salary` BIGINT NOT NULL,
  `net_salary` BIGINT NOT NULL,
  `status` ENUM('DRAFT', 'CALCULATED', 'PAID') DEFAULT 'DRAFT',
  `payment_date` VARCHAR(10) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_emp_month` (`employee_id`, `month`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۹. جدول لاگ وقایع و امنیت
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
  FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ۱۰. داده‌های اولیه تجاری (تنظیمات شرکت و اکانت مدیر: مجید نورایی)
INSERT INTO `companies` (`id`, `name`, `code`, `address`, `phone`, `office_lat`, `office_lng`, `allowed_gps_radius`, `qr_refresh_interval_sec`)
VALUES ('comp_mgommon_01', 'M.GAMMON', 'MG-101', 'مشهد، توس ۱۴۲، حسین زاده ۸', '۰۵۱-۳۶۹۰۹۰۹۰', 36.37660, 59.50820, 35, 30)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

INSERT INTO `shifts` (`id`, `company_id`, `name`, `type`, `start_time`, `end_time`, `thursday_end_time`, `break_duration_minutes`, `late_tolerance_minutes`, `early_exit_tolerance_minutes`)
VALUES 
('shift_standard_day', 'comp_mgommon_01', 'شیفت استاندارد روزانه کارگاهی', 'MORNING', '07:00', '16:00', '13:00', 60, 15, 10),
('shift_evening_workshop', 'comp_mgommon_01', 'شیفت عصر و شب کارگاه', 'EVENING', '14:00', '22:00', '14:00', 45, 10, 10)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- فقط مجید نورایی به عنوان مدیر ارشد در سامانه اکانت دارد
INSERT INTO `users` (`id`, `company_id`, `username`, `password_hash`, `name`, `email`, `role`, `employee_id`)
VALUES ('usr_admin', 'comp_mgommon_01', 'admin', '123', 'مجید نورایی', 'm.nouraei@mgommon.ir', 'ADMIN', NULL)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

SET FOREIGN_KEY_CHECKS = 1;
