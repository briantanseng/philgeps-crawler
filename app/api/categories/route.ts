import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    // Read categories from JSON file
    const categoriesPath = path.join(process.cwd(), 'data', 'philgeps-categories.json');
    const categoriesData = await fs.readFile(categoriesPath, 'utf-8');
    const categories = JSON.parse(categoriesData);
    
    // Extract just the text values for the dropdown
    const categoryNames = categories.map((cat: { value: string; text: string }) => cat.text).sort();
    
    return NextResponse.json({
      success: true,
      count: categoryNames.length,
      data: categoryNames
    });
  } catch (error: any) {
    console.error('Categories error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}