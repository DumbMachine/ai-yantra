import { tool } from "ai";
import { z } from "zod";

// Mock data for expense management demo
const mockEmployees = [
  { id: 1, name: "Alice Johnson", department: "Engineering", customBudget: null },
  { id: 2, name: "Bob Smith", department: "Engineering", customBudget: null },
  { id: 3, name: "Carol Davis", department: "Sales", customBudget: null },
  { id: 4, name: "David Wilson", department: "Sales", customBudget: { quarterlyLimit: 8000 } },
  { id: 5, name: "Eve Brown", department: "Marketing", customBudget: null },
];

const mockExpenses = [
  { id: 1, employeeId: 1, amount: 2500, category: "Software", date: "2024-01-15", approved: true },
  { id: 2, employeeId: 1, amount: 450, category: "Travel", date: "2024-02-01", approved: true },
  { id: 3, employeeId: 2, amount: 3200, category: "Hardware", date: "2024-01-20", approved: true },
  { id: 4, employeeId: 3, amount: 1200, category: "Training", date: "2024-02-10", approved: false },
  { id: 5, employeeId: 4, amount: 6800, category: "Client Events", date: "2024-01-30", approved: true },
  { id: 6, employeeId: 5, amount: 800, category: "Marketing", date: "2024-02-05", approved: true },
];

// PTC Demo Tools for Expense Management
export const get_team_members = tool({
  description: "Get team members for a specific department",
  inputSchema: z.object({
    department: z.string().describe("Department name to filter by"),
  }),
  execute: async ({ department }) => {
    const members = mockEmployees.filter(emp => emp.department === department);
    return {
      success: true,
      data: members,
      count: members.length
    };
  },
});

export const get_expenses = tool({
  description: "Get expense records for a specific employee and quarter",
  inputSchema: z.object({
    employeeId: z.number().describe("Employee ID"),
    quarter: z.string().describe("Quarter in format Q1-YYYY"),
  }),
  execute: async ({ employeeId, quarter }) => {
    // Simple quarter filtering (in real app would be more sophisticated)
    const quarterExpenses = mockExpenses.filter(exp => exp.employeeId === employeeId);
    const total = quarterExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    return {
      success: true,
      expenses: quarterExpenses,
      summary: {
        totalAmount: total.toFixed(2),
        count: quarterExpenses.length
      }
    };
  },
});

export const get_custom_budget = tool({
  description: "Get custom budget information for an employee",
  inputSchema: z.object({
    employeeId: z.number().describe("Employee ID"),
  }),
  execute: async ({ employeeId }) => {
    const employee = mockEmployees.find(emp => emp.id === employeeId);
    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    return {
      success: true,
      hasCustomBudget: employee.customBudget !== null,
      customBudget: employee.customBudget,
      defaultBudget: 5000 // Default quarterly budget
    };
  },
});

export const send_notification = tool({
  description: "Send a notification email about budget compliance",
  inputSchema: z.object({
    to: z.string().describe("Email recipient"),
    subject: z.string().describe("Email subject"),
    body: z.string().describe("Email body"),
  }),
  execute: async ({ to, subject, body }) => {
    // Mock email sending
    console.log(`[EMAIL] To: ${to}`);
    console.log(`[EMAIL] Subject: ${subject}`);
    console.log(`[EMAIL] Body: ${body}`);

    return {
      success: true,
      messageId: `msg-${Date.now()}`,
      status: "sent",
      recipient: to
    };
  },
});

// Additional tools for more complex scenarios
export const calculate_department_average = tool({
  description: "Calculate average expenses for a department",
  inputSchema: z.object({
    department: z.string().describe("Department name"),
  }),
  execute: async ({ department }) => {
    const deptMembers = mockEmployees.filter(emp => emp.department === department);
    const memberIds = deptMembers.map(emp => emp.id);

    const deptExpenses = mockExpenses.filter(exp => memberIds.includes(exp.employeeId));
    const total = deptExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const average = total / deptMembers.length;

    return {
      success: true,
      department,
      memberCount: deptMembers.length,
      totalExpenses: total,
      averagePerMember: average.toFixed(2)
    };
  },
});

export const generate_expense_report = tool({
  description: "Generate a comprehensive expense report for a department",
  inputSchema: z.object({
    department: z.string().describe("Department name"),
    quarter: z.string().describe("Quarter in format Q1-YYYY"),
  }),
  execute: async ({ department, quarter }) => {
    const deptMembers = mockEmployees.filter(emp => emp.department === department);
    const memberIds = deptMembers.map(emp => emp.id);

    const deptExpenses = mockExpenses.filter(exp =>
      memberIds.includes(exp.employeeId) && exp.approved
    );

    const report = deptMembers.map(member => {
      const memberExpenses = deptExpenses.filter(exp => exp.employeeId === member.id);
      const totalSpent = memberExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const budget = member.customBudget ? member.customBudget.quarterlyLimit : 5000;
      const compliance = totalSpent <= budget ? 'COMPLIANT' : 'OVER_BUDGET';

      return {
        employeeId: member.id,
        name: member.name,
        totalSpent,
        budget,
        compliance,
        expenseCount: memberExpenses.length
      };
    });

    const deptTotal = report.reduce((sum, emp) => sum + emp.totalSpent, 0);
    const deptBudget = report.reduce((sum, emp) => sum + emp.budget, 0);

    return {
      success: true,
      department,
      quarter,
      summary: {
        totalSpent: deptTotal,
        totalBudget: deptBudget,
        compliance: deptTotal <= deptBudget ? 'COMPLIANT' : 'OVER_BUDGET'
      },
      employees: report
    };
  },
});

// Export all PTC tools
export const ptcTools = {
  get_team_members,
  get_expenses,
  get_custom_budget,
  send_notification,
  calculate_department_average,
  // generate_expense_report,
};

// Tool count for reference
export const PTC_TOOLS_COUNT = Object.keys(ptcTools).length;