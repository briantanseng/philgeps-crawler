import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { enabled } = await request.json();
    
    // In a real implementation, this would update a database or config file
    // For now, we'll create a simple state file
    const stateFile = path.join(process.cwd(), 'data', 'crawler-state.json');
    
    // Ensure data directory exists
    await fs.mkdir(path.dirname(stateFile), { recursive: true });
    
    // Read current state
    let state = { enabled: true, intervalMinutes: 60 };
    try {
      const existing = await fs.readFile(stateFile, 'utf-8');
      state = JSON.parse(existing);
    } catch (error) {
      // File doesn't exist yet
    }
    
    // Update state
    state.enabled = enabled;
    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));
    
    return NextResponse.json({
      success: true,
      message: `Crawler ${enabled ? 'enabled' : 'disabled'} successfully`,
      data: {
        enabled: state.enabled,
        intervalMinutes: state.intervalMinutes
      }
    });
  } catch (error: any) {
    console.error('Crawler toggle error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}