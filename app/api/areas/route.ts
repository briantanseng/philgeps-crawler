import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    // Read areas from JSON file
    const areasPath = path.join(process.cwd(), 'data', 'philgeps-areas.json');
    const areasData = await fs.readFile(areasPath, 'utf-8');
    const areas = JSON.parse(areasData);
    
    // Extract just the text values for the dropdown, excluding some entries
    const areaNames = areas
      .map((area: { value: string; text: string }) => area.text)
      .filter((text: string) => 
        text !== 'sample province' && 
        text !== '(Independent City)' &&
        text !== 'Special Geographic Area'
      )
      .sort();
    
    return NextResponse.json({
      success: true,
      count: areaNames.length,
      data: areaNames
    });
  } catch (error: any) {
    console.error('Areas error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}