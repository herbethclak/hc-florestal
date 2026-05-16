# 📖 User Manual - HC Forestry Management

This manual describes the features and operation flow of the **HC Forestry Management** system, focused on auditing, regulation, and field control.

---

## 1. System Access
Access is performed via Google Authentication.
- **Administrators:** Have full access to settings, users, and data deletion.
- **Managers:** Can create Service Orders (SO) and manage resources.
- **Operators:** View their activities and record daily progress.

> **[INSERT LOGIN SCREEN PRINT HERE]**

---

## 2. Dashboard (Control Panel)
The heart of the system. Here you can view:
- **Real-Time Weather:** Temperature, humidity, and wind data to decide if spraying is safe.
- **Production Summary:** Total area completed vs. Goal.
- **Input Status:** Visual alert if stock is low.
- **Recent Activities:** List of the last SOs moved.

> **[INSERT DASHBOARD PRINT HERE]**

---

## 3. Nozzle Regulation (50-Meter Method)
Exclusive feature to ensure application precision.
1. Go to **New SO** or access the **Resources** tab.
2. Enter the **Time in 50m** (measured in the field).
3. The system will automatically calculate the **Flow per Nozzle (L/min)** based on your Target Rate.
4. **Golden Rule:** If the calculated flow differs from the measurement at the nozzle, adjust the machine pressure.

> **[INSERT REGULATION CALCULATOR PRINT HERE]**

---

## 4. Creating a Service Order (SO)
The creation flow is guided (Wizard):
1. **Activity:** Select the type (Spraying, Fertilizing, etc.).
2. **Location:** Choose the Field (the system already brings the total area).
3. **Team and Machine:** Select the operator, tractor, and implement.
4. **Inputs:** Define the Target Rate (e.g., 100 L/ha). The system will calculate the **Total Requirement** for the field.

> **[INSERT NEW SO FLOW PRINT HERE]**

---

## 5. Auditing and Closing
During the operation, the system monitors the deviation:
- **Theoretical Area Calculation:** Based on the input consumed.
- **Deviation Alert:** If the deviation between planned and actual is greater than **5%**, the field will turn **RED**, indicating an application error or leak.

> **[INSERT SO DETAILS WITH DEVIATION ALERT PRINT HERE]**

---

## 6. Resource Management
Manage your inventory simply:
- **Operators:** Registration with photo and specialty.
- **Machines:** Hour meter and maintenance control.
- **Inputs:** Stock balance with automatic update at each SO closing.

> **[INSERT RESOURCES SCREEN PRINT HERE]**

---

## 7. Settings and Access (Admin)
Only administrators can manage who accesses the system through the **Access Management** tab, linking Google emails to permission profiles.

> **[INSERT ACCESS MANAGEMENT SCREEN PRINT HERE]**

---
*Developed for maximum precision in the forestry field.*
