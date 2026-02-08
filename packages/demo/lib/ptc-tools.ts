import { tool } from "ai";
import { z } from "zod";

// Type definitions
interface Employee {
	id: string;
	name: string;
	role: string;
	level: string;
	email: string;
	department: string;
}

interface Expense {
	expense_id: string;
	date: string;
	category: string;
	description: string;
	amount: number;
	currency: string;
	status: string;
	receipt_url: string;
	approved_by: string | null;
	store_name: string;
	store_location: string;
	reimbursement_date: string | null;
	payment_method: string;
	project_code: string;
	notes: string;
}

interface CustomBudget {
	user_id: string;
	has_custom_budget: boolean;
	travel_budget: number;
	reason: string;
	currency: string;
}

// Configuration
const EXPENSE_LINE_ITEMS_PER_PERSON_MIN = 20;
const EXPENSE_LINE_ITEMS_PER_PERSON_MAX = 50;
const DELAY_MULTIPLIER = 0; // Adjust this to simulate API latency

// Mock team data by department
const teams: Record<string, Employee[]> = {
	engineering: [
		{
			id: "ENG001",
			name: "Alice Chen",
			role: "Senior Software Engineer",
			level: "senior",
			email: "alice.chen@company.com",
			department: "engineering",
		},
		{
			id: "ENG002",
			name: "Bob Martinez",
			role: "Staff Engineer",
			level: "staff",
			email: "bob.martinez@company.com",
			department: "engineering",
		},
		{
			id: "ENG003",
			name: "Carol White",
			role: "Software Engineer",
			level: "mid",
			email: "carol.white@company.com",
			department: "engineering",
		},
		{
			id: "ENG004",
			name: "David Kim",
			role: "Principal Engineer",
			level: "principal",
			email: "david.kim@company.com",
			department: "engineering",
		},
		{
			id: "ENG005",
			name: "Emma Johnson",
			role: "Junior Software Engineer",
			level: "junior",
			email: "emma.johnson@company.com",
			department: "engineering",
		},
		{
			id: "ENG006",
			name: "Frank Liu",
			role: "Senior Software Engineer",
			level: "senior",
			email: "frank.liu@company.com",
			department: "engineering",
		},
		{
			id: "ENG007",
			name: "Grace Taylor",
			role: "Software Engineer",
			level: "mid",
			email: "grace.taylor@company.com",
			department: "engineering",
		},
		{
			id: "ENG008",
			name: "Henry Park",
			role: "Staff Engineer",
			level: "staff",
			email: "henry.park@company.com",
			department: "engineering",
		},
	],
	sales: [
		{
			id: "SAL001",
			name: "Irene Davis",
			role: "Account Executive",
			level: "mid",
			email: "irene.davis@company.com",
			department: "sales",
		},
		{
			id: "SAL002",
			name: "Jack Wilson",
			role: "Senior Account Executive",
			level: "senior",
			email: "jack.wilson@company.com",
			department: "sales",
		},
		{
			id: "SAL003",
			name: "Kelly Brown",
			role: "Sales Development Rep",
			level: "junior",
			email: "kelly.brown@company.com",
			department: "sales",
		},
		{
			id: "SAL004",
			name: "Leo Garcia",
			role: "Regional Sales Director",
			level: "staff",
			email: "leo.garcia@company.com",
			department: "sales",
		},
		{
			id: "SAL005",
			name: "Maya Patel",
			role: "Account Executive",
			level: "mid",
			email: "maya.patel@company.com",
			department: "sales",
		},
		{
			id: "SAL006",
			name: "Nathan Scott",
			role: "VP of Sales",
			level: "principal",
			email: "nathan.scott@company.com",
			department: "sales",
		},
	],
	marketing: [
		{
			id: "MKT001",
			name: "Olivia Thompson",
			role: "Marketing Manager",
			level: "senior",
			email: "olivia.thompson@company.com",
			department: "marketing",
		},
		{
			id: "MKT002",
			name: "Peter Anderson",
			role: "Content Specialist",
			level: "mid",
			email: "peter.anderson@company.com",
			department: "marketing",
		},
		{
			id: "MKT003",
			name: "Quinn Rodriguez",
			role: "Marketing Coordinator",
			level: "junior",
			email: "quinn.rodriguez@company.com",
			department: "marketing",
		},
		{
			id: "MKT004",
			name: "Rachel Lee",
			role: "Director of Marketing",
			level: "staff",
			email: "rachel.lee@company.com",
			department: "marketing",
		},
		{
			id: "MKT005",
			name: "Sam Miller",
			role: "Social Media Manager",
			level: "mid",
			email: "sam.miller@company.com",
			department: "marketing",
		},
	],
};

// Employees with custom budget exceptions
const customBudgets: Record<string, CustomBudget> = {
	ENG002: {
		user_id: "ENG002",
		has_custom_budget: true,
		travel_budget: 8000,
		reason: "Staff engineer with regular client site visits",
		currency: "USD",
	},
	ENG004: {
		user_id: "ENG004",
		has_custom_budget: true,
		travel_budget: 12000,
		reason:
			"Principal engineer leading distributed team across multiple offices",
		currency: "USD",
	},
	SAL004: {
		user_id: "SAL004",
		has_custom_budget: true,
		travel_budget: 15000,
		reason: "Regional sales director covering west coast territory",
		currency: "USD",
	},
	SAL006: {
		user_id: "SAL006",
		has_custom_budget: true,
		travel_budget: 20000,
		reason: "VP of Sales with extensive client travel requirements",
		currency: "USD",
	},
	MKT004: {
		user_id: "MKT004",
		has_custom_budget: true,
		travel_budget: 10000,
		reason:
			"Director of Marketing attending industry conferences and partner meetings",
		currency: "USD",
	},
};

// Helper function to generate expenses
function generateExpenses(employeeId: string, quarter: string): Expense[] {
	// Generate a deterministic but varied number of expenses based on employee_id
	const seed = employeeId + quarter;
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		const char = seed.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32bit integer
	}
	const random = (seed: number) => {
		const x = Math.sin(seed) * 10000;
		return x - Math.floor(x);
	};

	const numExpenses =
		Math.floor(
			random(hash) *
				(EXPENSE_LINE_ITEMS_PER_PERSON_MAX -
					EXPENSE_LINE_ITEMS_PER_PERSON_MIN +
					1),
		) + EXPENSE_LINE_ITEMS_PER_PERSON_MIN;

	// Quarter date ranges
	const quarterDates: Record<string, [Date, Date]> = {
		Q1: [new Date(2024, 0, 1), new Date(2024, 2, 31)],
		Q2: [new Date(2024, 3, 1), new Date(2024, 5, 30)],
		Q3: [new Date(2024, 6, 1), new Date(2024, 8, 30)],
		Q4: [new Date(2024, 9, 1), new Date(2024, 11, 31)],
	};

	const quarterKey = quarter.toUpperCase();
	if (!(quarterKey in quarterDates)) {
		throw new Error(`Invalid quarter '${quarter}'. Must be Q1, Q2, Q3, or Q4`);
	}

	const [startDate, endDate] = quarterDates[quarterKey];

	// Expense categories and typical amounts
	const expenseCategories: [string, string, number, number][] = [
		["travel", "Flight to client meeting", 400, 1500],
		["travel", "Train ticket", 1000, 1500],
		["travel", "Rental car", 1000, 1500],
		["travel", "Taxi/Uber", 150, 200],
		["travel", "Parking fee", 10, 50],
		["lodging", "Hotel stay", 150, 1900],
		["lodging", "Airbnb rental", 1000, 1950],
		["meals", "Client dinner", 50, 250],
		["meals", "Team lunch", 20, 100],
		["meals", "Conference breakfast", 15, 40],
		["meals", "Coffee meeting", 5, 25],
		["software", "SaaS subscription", 10, 200],
		["software", "API credits", 50, 500],
		["equipment", "Monitor", 200, 800],
		["equipment", "Keyboard", 50, 200],
		["equipment", "Webcam", 50, 150],
		["equipment", "Headphones", 100, 300],
		["conference", "Conference ticket", 500, 2500],
		["conference", "Workshop registration", 200, 1000],
		["office", "Office supplies", 10, 100],
		["office", "Books", 20, 80],
		["internet", "Mobile data", 30, 100],
		["internet", "WiFi hotspot", 20, 60],
	];

	// Manager names for approvals
	const managers = [
		"Sarah Johnson",
		"Michael Chen",
		"Emily Rodriguez",
		"David Park",
		"Jennifer Martinez",
	];

	// Store/merchant names by category
	const merchants: Record<string, string[]> = {
		travel: [
			"United Airlines",
			"Delta",
			"American Airlines",
			"Southwest",
			"Enterprise Rent-A-Car",
		],
		lodging: ["Marriott", "Hilton", "Hyatt", "Airbnb", "Holiday Inn"],
		meals: [
			"Olive Garden",
			"Starbucks",
			"The Capital Grille",
			"Chipotle",
			"Panera Bread",
		],
		software: ["AWS", "GitHub", "Linear", "Notion", "Figma"],
		equipment: ["Amazon", "Best Buy", "Apple Store", "B&H Photo", "Newegg"],
		conference: [
			"EventBrite",
			"WWDC",
			"AWS re:Invent",
			"Google I/O",
			"ReactConf",
		],
		office: ["Staples", "Office Depot", "Amazon", "Target"],
		internet: ["Verizon", "AT&T", "T-Mobile", "Comcast"],
	};

	// US cities for store locations
	const cities = [
		"San Francisco, CA",
		"New York, NY",
		"Austin, TX",
		"Seattle, WA",
		"Boston, MA",
		"Chicago, IL",
		"Denver, CO",
		"Los Angeles, CA",
		"Portland, OR",
		"Miami, FL",
	];

	// Project codes
	const projectCodes = [
		"PROJ-1001",
		"PROJ-1002",
		"PROJ-2001",
		"DEPT-ENG",
		"DEPT-OPS",
		"CLIENT-A",
		"CLIENT-B",
	];

	// Justification templates
	const justifications: Record<string, string[]> = {
		travel: [
			"Client meeting to discuss Q4 roadmap and requirements",
			"On-site visit for infrastructure review and planning",
			"Conference attendance for professional development",
			"Team offsite for strategic planning session",
			"Customer presentation and product demo",
		],
		lodging: [
			"Hotel for multi-day client visit",
			"Accommodation during conference attendance",
			"Extended stay for project implementation",
			"Lodging for team collaboration week",
		],
		meals: [
			"Client dinner discussing partnership opportunities",
			"Team lunch during sprint planning",
			"Breakfast meeting with stakeholders",
			"Working dinner during crunch period",
		],
		software: [
			"Required tool for development workflow",
			"API credits for production workload",
			"Team collaboration platform subscription",
			"Design and prototyping tool license",
		],
		equipment: [
			"Replacing failed hardware",
			"Upgraded monitor for productivity",
			"Required for remote work setup",
			"Better equipment for video calls",
		],
		conference: [
			"Professional development - learning new technologies",
			"Networking with industry leaders and potential partners",
			"Presenting company work at industry event",
			"Training workshop for certification",
		],
		office: [
			"Supplies for home office setup",
			"Reference materials for project work",
			"Team whiteboarding supplies",
		],
		internet: [
			"Mobile hotspot for reliable connectivity",
			"Upgraded internet for remote work",
			"International data plan for travel",
		],
	};

	const expenses = [];
	for (let i = 0; i < numExpenses; i++) {
		const categoryData =
			expenseCategories[
				Math.floor(random(hash + i) * expenseCategories.length)
			];
		const [category, descTemplate, minAmt, maxAmt] = categoryData;

		// Generate random date within quarter
		const daysDiff = Math.floor(
			(endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
		);
		const randomDays = Math.floor(random(hash + i + 1) * (daysDiff + 1));
		const expenseDate = new Date(
			startDate.getTime() + randomDays * 24 * 60 * 60 * 1000,
		);

		// Generate amount
		const amount =
			Math.round((random(hash + i + 2) * (maxAmt - minAmt) + minAmt) * 100) /
			100;

		// Status (most are approved)
		const statusWeights = [0.85, 0.1, 0.05]; // approved, pending, rejected
		let status = "approved";
		const rand = random(hash + i + 3);
		if (rand > statusWeights[0]) {
			status =
				rand > statusWeights[0] + statusWeights[1] ? "rejected" : "pending";
		}

		// Generate additional metadata
		const approvedBy =
			status === "approved"
				? managers[Math.floor(random(hash + i + 4) * managers.length)]
				: null;
		const storeName = merchants[category]
			? merchants[category][
					Math.floor(random(hash + i + 5) * merchants[category].length)
				]
			: "Unknown Merchant";
		const storeLocation =
			cities[Math.floor(random(hash + i + 6) * cities.length)];
		const paymentMethod =
			random(hash + i + 7) > 0.5 ? "corporate_card" : "personal_reimbursement";
		const projectCode =
			projectCodes[Math.floor(random(hash + i + 8) * projectCodes.length)];
		const notes = justifications[category]
			? justifications[category][
					Math.floor(random(hash + i + 9) * justifications[category].length)
				]
			: "Business expense";

		// Reimbursement date is 15-30 days after expense date for approved expenses
		let reimbursementDate = null;
		if (status === "approved" && paymentMethod === "personal_reimbursement") {
			const reimbDays = Math.floor(random(hash + i + 10) * 16) + 15;
			const reimbDate = new Date(
				expenseDate.getTime() + reimbDays * 24 * 60 * 60 * 1000,
			);
			reimbursementDate = reimbDate.toISOString().split("T")[0];
		}

		expenses.push({
			expense_id: `${employeeId}_${quarter}_${i.toString().padStart(3, "0")}`,
			date: expenseDate.toISOString().split("T")[0],
			category,
			description: descTemplate,
			amount,
			currency: "USD",
			status,
			receipt_url: `https://receipts.company.com/${employeeId}/${quarter}/${i.toString().padStart(3, "0")}.pdf`,
			approved_by: approvedBy,
			store_name: storeName,
			store_location: storeLocation,
			reimbursement_date: reimbursementDate,
			payment_method: paymentMethod,
			project_code: projectCode,
			notes,
		});
	}

	// Sort by date
	expenses.sort(
		(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
	);

	return expenses;
}

// PTC Demo Tools for Expense Management
export const get_team_members = tool({
	description:
		"Returns a list of team members for a given department. Each team member includes their ID, name, role, level, and contact information. Use this to get a list of people whose expenses you want to analyze.",
	inputSchema: z.object({
		department: z
			.string()
			.describe(
				"The department name (e.g., 'engineering', 'sales', 'marketing'). Case-insensitive.",
			),
	}),
	execute: async ({ department }) => {
		// Simulate delay
		await new Promise((resolve) => setTimeout(resolve, DELAY_MULTIPLIER * 100));

		const dept = department.toLowerCase();

		if (!(dept in teams)) {
			return {
				error: `Department '${department}' not found. Available departments: ${Object.keys(teams).join(", ")}`,
			};
		}

		return teams[dept];
	},
});

export const get_expenses = tool({
	description:
		"Returns all expense line items for a given employee in a specific quarter. Each expense includes comprehensive metadata: date, category, description, amount, receipt details, approval chain, merchant information, and more. An employee may have anywhere from a few to 150+ expense line items per quarter, and each line item contains substantial metadata for audit and compliance purposes.",
	inputSchema: z.object({
		employee_id: z
			.string()
			.describe("The unique employee identifier (e.g., 'ENG001', 'SAL002')"),
		quarter: z
			.string()
			.describe("Quarter identifier (e.g., 'Q1', 'Q2', 'Q3', 'Q4')"),
	}),
	execute: async ({ employee_id, quarter }) => {
		// Simulate delay
		await new Promise((resolve) => setTimeout(resolve, DELAY_MULTIPLIER * 200));

		try {
			const expenses = generateExpenses(employee_id, quarter);
			return expenses;
		} catch (error) {
			return { error: (error as Error).message };
		}
	},
});

export const get_custom_budget = tool({
	description:
		"Get the custom quarterly travel budget for a specific employee. Most employees have a standard $5,000 quarterly travel budget. However, some employees have custom budget exceptions based on their role requirements. This function checks if a specific employee has a custom budget assigned.",
	inputSchema: z.object({
		user_id: z
			.string()
			.describe("The unique employee identifier (e.g., 'ENG001', 'SAL002')"),
	}),
	execute: async ({ user_id }) => {
		// Simulate delay
		await new Promise((resolve) => setTimeout(resolve, DELAY_MULTIPLIER * 50));

		// Check if user has custom budget
		if (user_id in customBudgets) {
			return customBudgets[user_id];
		}

		// Return standard budget
		return {
			user_id,
			has_custom_budget: false,
			travel_budget: 5000,
			reason: "Standard quarterly travel budget",
			currency: "USD",
		};
	},
});

// Export all PTC tools
export const ptcTools = {
	get_team_members,
	get_expenses,
	get_custom_budget,
};

// Tool count for reference
export const PTC_TOOLS_COUNT = Object.keys(ptcTools).length;
