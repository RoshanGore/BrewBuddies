import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

import Cafe from "../models/Cafe.js";
import User from "../models/User.js";
import Table from "../models/Table.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Order from "../models/Order.js";
import Reward from "../models/Reward.js";
import RewardRedemption from "../models/RewardRedemption.js";
import Offer from "../models/Offer.js";
import CustomerPointsTransaction from "../models/CustomerPointsTransaction.js";
import CafeSetting from "../models/CafeSetting.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const seed = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error("MONGODB_URI is not defined");

    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log("[Seed] Connected to MongoDB at", mongoUri.split("@")[1] || mongoUri);

    // 1. Clear existing collections
    await Promise.all([
      Cafe.deleteMany(),
      User.deleteMany(),
      Category.deleteMany(),
      Product.deleteMany(),
      Order.deleteMany(),
      Reward.deleteMany(),
      RewardRedemption.deleteMany(),
      Offer.deleteMany(),
      Table.deleteMany(),
      CustomerPointsTransaction.deleteMany(),
      CafeSetting.deleteMany(),
    ]);

    console.log("[Seed] Cleared existing data across all collections");

    // 2. Create Owner, Staff, and Customer Users with bcrypt hashes
    const salt = await bcrypt.genSalt(10);
    const ownerPasswordHash = await bcrypt.hash("admin123", salt);
    const staffPasswordHash = await bcrypt.hash("staff123", salt);
    const customerPasswordHash = await bcrypt.hash("customer123", salt);

    const owner = await User.create({
      name: "Cafe Manager",
      email: "owner@brewbuddies.com",
      phone: "+919876543210",
      passwordHash: ownerPasswordHash,
      role: "owner",
    });

    // 3. Create Multi-Tenant Cafe
    const cafe = await Cafe.create({
      name: "BrewBuddies Flagship Cafe",
      slug: "brewbuddies-downtown",
      logo: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=300&q=80",
      address: "42 Roaster Avenue, Downtown",
      phone: "+91 (11) 4567-BREW",
      email: "contact@brewbuddies.com",
      ownerId: owner._id,
      taxRate: 5,
      pointsPerDollar: 10,
      wifiSsid: "BrewBuddies_Guest_WiFi",
      wifiPassword: "CoffeeVibes2026",
    });

    // Associate owner with their cafe
    owner.cafeId = cafe._id;
    await owner.save();

    // Create Staff user linked to cafe
    const staff = await User.create({
      name: "Alex Staff",
      email: "staff@brewbuddies.com",
      phone: "+919876543211",
      passwordHash: staffPasswordHash,
      role: "staff",
      cafeId: cafe._id,
    });

    // Create Demo Customer account with login
    const demoCustomer = await User.create({
      name: "Aarav Patel",
      email: "customer@brewbuddies.com",
      phone: "+919876543212",
      passwordHash: customerPasswordHash,
      role: "customer",
      cafeId: cafe._id,
      points: 150,
      totalSpent: 450,
      ordersCount: 3,
    });

    console.log(`[Seed] Created Cafe: '${cafe.name}' (ID: ${cafe._id})`);
    console.log(`[Seed] Created Owner: ${owner.email}, Staff: ${staff.email}, Customer: ${demoCustomer.email}`);

    // Create legacy CafeSetting document for backward compatibility
    await CafeSetting.create({
      cafeName: cafe.name,
      tagline: "Crafted Coffee & Cozy Moments",
      currency: "₹",
      taxRate: cafe.taxRate,
      pointsPerDollar: cafe.pointsPerDollar,
      wifiSsid: cafe.wifiSsid,
      wifiPassword: cafe.wifiPassword,
      address: cafe.address,
      phone: cafe.phone,
    });

    // 4. Create Demo Diners (table session diners)
    const customer1 = await User.create({
      name: "Sophia Martinez",
      phone: "9876543210",
      email: "sophia@example.com",
      role: "customer",
      cafeId: cafe._id,
      points: 240,
      totalSpent: 480,
      ordersCount: 4,
    });

    const customer2 = await User.create({
      name: "Liam Chen",
      phone: "9123456780",
      email: "liam@example.com",
      role: "customer",
      cafeId: cafe._id,
      points: 110,
      totalSpent: 220,
      ordersCount: 2,
    });

    console.log("[Seed] Created demo customer profiles with loyalty points");

    // 5. Create Menu Categories
    const categories = await Category.insertMany([
      { name: "Espresso & Hot Brews", description: "Rich, bold handcrafted coffees", icon: "coffee", displayOrder: 1 },
      { name: "Cold Brews & Iced Delights", description: "Slow-steeped refreshing chillers", icon: "cup-soda", displayOrder: 2 },
      { name: "Artisan Bakery", description: "Freshly baked morning croissants and sourdough", icon: "croissant", displayOrder: 3 },
      { name: "Gourmet Sandwiches & Bites", description: "Warm paninis and avocado sourdough", icon: "sandwich", displayOrder: 4 },
      { name: "Desserts & Sweets", description: "Cheesecakes and sweet bakery items", icon: "cake", displayOrder: 5 },
    ]);

    const [catEspresso, catCold, catBakery, catSandwich, catDessert] = categories;

    // 6. Create Products with cafeId (INR Pricing)
    const products = await Product.insertMany([
      {
        cafeId: cafe._id,
        name: "Caramel Cloud Macchiato",
        category: catEspresso._id,
        description: "Freshly pulled double espresso over vanilla steamed milk with caramel drizzle crosshatch.",
        price: 240,
        image: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=600&q=80",
        isVegetarian: true,
        isAvailable: true,
        preparationTimeMinutes: 5,
        tags: ["Bestseller", "Signature"],
      },
      {
        cafeId: cafe._id,
        name: "Artisan Flat White",
        category: catEspresso._id,
        description: "Ristretto double shot blended with microfoam textured whole milk, adorned with swan latte art.",
        price: 210,
        image: "https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=600&q=80",
        isVegetarian: true,
        isAvailable: true,
        preparationTimeMinutes: 4,
        tags: ["Popular"],
      },
      {
        cafeId: cafe._id,
        name: "Spanish Iced Latte",
        category: catCold._id,
        description: "Espresso sweetened with silky condensed milk poured over crystal ice blocks.",
        price: 260,
        image: "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80",
        isVegetarian: true,
        isAvailable: true,
        preparationTimeMinutes: 4,
        tags: ["Customer Favorite"],
      },
      {
        cafeId: cafe._id,
        name: "Vanilla Sweet Cream Cold Brew",
        category: catCold._id,
        description: "Slow-steeped 18-hour cold brew topped with house-made vanilla sweet cream float.",
        price: 230,
        image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=600&q=80",
        isVegetarian: true,
        isAvailable: true,
        preparationTimeMinutes: 3,
        tags: ["Refreshing", "Low Acid"],
      },
      {
        cafeId: cafe._id,
        name: "Flaky Almond Croissant",
        category: catBakery._id,
        description: "Golden buttery French pastry filled with sweet almond frangipane and dusted with sugar.",
        price: 180,
        image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80",
        isVegetarian: true,
        isAvailable: true,
        preparationTimeMinutes: 2,
        tags: ["Fresh Baked", "Bestseller"],
      },
      {
        cafeId: cafe._id,
        name: "Avocado & Truffle Sourdough Toast",
        category: catSandwich._id,
        description: "Toasted artisan sourdough, mashed Hass avocado, cherry tomatoes, and white truffle oil.",
        price: 320,
        image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
        isVegetarian: true,
        isAvailable: true,
        preparationTimeMinutes: 8,
        tags: ["Chef Special", "Healthy"],
      },
      {
        cafeId: cafe._id,
        name: "Smoked Turkey & Pesto Panini",
        category: catSandwich._id,
        description: "Sliced turkey breast, fresh mozzarella, sundried tomatoes, and basil pesto on rustic focaccia.",
        price: 360,
        image: "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80",
        isVegetarian: false,
        isAvailable: true,
        preparationTimeMinutes: 10,
        tags: ["Warm & Toasty"],
      },
      {
        cafeId: cafe._id,
        name: "Basque Burnt Cheesecake",
        category: catDessert._id,
        description: "Creamy, caramelized crust cheesecake with a custardy molten center. Served with berry coulis.",
        price: 250,
        image: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80",
        isVegetarian: true,
        isAvailable: true,
        preparationTimeMinutes: 3,
        tags: ["Signature Dessert"],
      },
    ]);

    console.log(`[Seed] Inserted ${products.length} products linked to cafeId: ${cafe._id}`);

    // 7. Create Tables with cafeId and unique qrToken
    const tables = [];
    for (let i = 1; i <= 8; i++) {
      tables.push({
        cafeId: cafe._id,
        tableNumber: i,
        capacity: i <= 4 ? 4 : 6,
        status: i === 3 ? "occupied" : "vacant",
        isActive: true,
      });
    }
    const createdTables = await Table.insertMany(tables);
    console.log(`[Seed] Generated 8 cafe tables for '${cafe.name}'`);

    // 8. Create Rewards with cafeId (in INR)
    const rewards = await Reward.insertMany([
      {
        cafeId: cafe._id,
        name: "Free Classic Cappuccino",
        description: "Redeem 120 points for a freshly steamed cappuccino of your choice.",
        pointsRequired: 120,
        rewardType: "free_item",
        rewardValue: 210,
        productId: products[1]._id,
        isActive: true,
      },
      {
        cafeId: cafe._id,
        name: "₹50 Off Your Dine-In Bill",
        description: "Get ₹50 instant deduction on any order of ₹200 or more.",
        pointsRequired: 150,
        rewardType: "fixed_discount",
        rewardValue: 50.0,
        isActive: true,
      },
      {
        cafeId: cafe._id,
        name: "Free Fresh Almond Croissant",
        description: "Enjoy a warm, flaky almond croissant on the house!",
        pointsRequired: 100,
        rewardType: "free_item",
        rewardValue: 180,
        productId: products[4]._id,
        isActive: true,
      },
      {
        cafeId: cafe._id,
        name: "20% Off Entire Dine-in Order",
        description: "VIP diner discount for our true coffee aficionados.",
        pointsRequired: 200,
        rewardType: "percentage_discount",
        rewardValue: 20,
        isActive: true,
      },
    ]);
    console.log(`[Seed] Created ${rewards.length} loyalty rewards`);

    // 9. Create Offers with cafeId (in INR)
    await Offer.insertMany([
      {
        cafeId: cafe._id,
        code: "BREWFIRST",
        title: "First Table Visit: 20% Off",
        description: "Enjoy 20% off your first dine-in order with us!",
        discountType: "percentage",
        discountValue: 20,
        minOrderAmount: 200,
        maxDiscount: 100,
        isActive: true,
      },
      {
        cafeId: cafe._id,
        code: "COZY50",
        title: "₹50 Off Orders Above ₹300",
        description: "Save ₹50 immediately on any hot brew & food combo.",
        discountType: "flat",
        discountValue: 50,
        minOrderAmount: 300,
        isActive: true,
      },
      {
        cafeId: cafe._id,
        code: "SWEETTOOTH",
        title: "15% Off Artisan Bakery",
        description: "Treat yourself to fresh croissants and decadent cheesecakes.",
        discountType: "percentage",
        discountValue: 15,
        minOrderAmount: 150,
        isActive: true,
      },
    ]);
    console.log(`[Seed] Created 3 promotional offers`);

    // 10. Sample Orders & Points Transactions
    // Order 1 is SERVED -> points credited properly
    const order1 = await Order.create({
      cafeId: cafe._id,
      customerId: customer1._id,
      tableId: createdTables[2]._id,
      tableNumber: 3,
      orderNumber: "BB-1024",
      customerName: customer1.name,
      customerPhone: customer1.phone,
      items: [
        {
          productId: products[0]._id,
          name: products[0].name,
          price: products[0].price,
          quantity: 1,
          notes: "Extra hot, oat milk please",
        },
        {
          productId: products[4]._id,
          name: products[4].name,
          price: products[4].price,
          quantity: 1,
          notes: "Warmed up",
        },
      ],
      subtotal: 420.0,
      discount: 50.0,
      tax: 18.5,
      total: 388.5,
      pointsEarned: 388,
      pointsCredited: true,
      status: "served",
      paymentStatus: "paid_at_counter",
    });

    // Record Points Transaction for order1 (since it is served)
    await CustomerPointsTransaction.create({
      cafeId: cafe._id,
      customerId: customer1._id,
      type: "earned",
      points: 388,
      description: "Earned 388 points on completed Order #BB-1024",
      orderId: order1._id,
    });

    // Order 2 is PENDING -> RULE 8: Zero loyalty points credited!
    const order2 = await Order.create({
      cafeId: cafe._id,
      customerId: customer2._id,
      tableId: createdTables[4]._id,
      tableNumber: 5,
      orderNumber: "BB-1025",
      customerName: customer2.name,
      customerPhone: customer2.phone,
      items: [
        {
          productId: products[2]._id,
          name: products[2].name,
          price: products[2].price,
          quantity: 2,
          notes: "Less sweet",
        },
      ],
      subtotal: 520.0,
      discount: 0,
      tax: 26.0,
      total: 546.0,
      pointsEarned: 0, // 0 until served
      pointsCredited: false,
      status: "pending",
      paymentStatus: "pending",
    });

    // Record a sample reward redemption for customer 1
    await RewardRedemption.create({
      cafeId: cafe._id,
      customerId: customer1._id,
      rewardId: rewards[0]._id,
      pointsUsed: rewards[0].pointsRequired,
      orderId: order1._id,
    });

    await CustomerPointsTransaction.create({
      cafeId: cafe._id,
      customerId: customer1._id,
      type: "redeemed",
      points: -Math.abs(rewards[0].pointsRequired),
      description: `Redeemed '${rewards[0].name}' on Order #BB-1024`,
      orderId: order1._id,
    });

    console.log("[Seed] Created active orders, customer points transactions, and reward redemption");
    console.log("\n=======================================================");
    console.log("Database Seed Successful! All 9 Collections Populated.");
    console.log("=======================================================\n");
    process.exit(0);
  } catch (err) {
    console.error("[Seed Error]:", err);
    process.exit(1);
  }
};

seed();
