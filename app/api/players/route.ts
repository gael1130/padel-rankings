import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Server-side Supabase client (environment variables are protected here)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a Supabase client with the admin key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("elo", { ascending: false });

    if (error) {
      // Log detailed error information server-side only
      console.error("Error fetching players:", error.message, error.details, error.hint);
      
      // Return a generic error message to the client
      return NextResponse.json(
        { error: "Unable to retrieve player data" }, 
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    // Log the full error details server-side
    console.error("Unexpected error in GET /api/players:", error);
    
    // Return a generic error message to the client
    return NextResponse.json(
      { error: "Unable to retrieve player data at this time" }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }
    
    // Basic validation
    const name = body.name.trim();
    const email = body.email.trim();
    
    if (name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { error: "Name must be between 2 and 50 characters" },
        { status: 400 }
      );
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }
    
    // Check for duplicate name or email
    const { data: existingPlayers, error: checkError } = await supabase
      .from("players")
      .select("name, email")
      .or(`name.ilike.${name},email.ilike.${email}`);
      
    if (checkError) {
      // Log detailed error information server-side
      console.error("Database error while checking for duplicates:", 
        checkError.message,
        checkError.details,
        checkError.hint
      );
      
      // Return a user-friendly error message
      return NextResponse.json(
        { error: "Unable to validate player information" },
        { status: 500 }
      );
    }
    
    if (existingPlayers && existingPlayers.length > 0) {
      const duplicateName = existingPlayers.find(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      );
      const duplicateEmail = existingPlayers.find(
        (p) => p.email.toLowerCase() === email.toLowerCase()
      );
      
      if (duplicateName) {
        return NextResponse.json(
          { error: "A player with this name already exists" },
          { status: 400 }
        );
      }
      
      if (duplicateEmail) {
        return NextResponse.json(
          { error: "A player with this email already exists" },
          { status: 400 }
        );
      }
    }
    
    // Insert new player
    const { data, error } = await supabase
      .from("players")
      .insert([
        {
          name: name,
          email: email,
          elo: 1000,
          matches: 0,
          wins: 0,
        },
      ])
      .select();
      
    if (error) {
      // Log detailed error information server-side only
      console.error("Database error while adding player:", 
        error.message, 
        error.details, 
        error.hint, 
        error.code
      );
      
      // Check for constraint violations or other specific errors
      if (error.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { error: "This player already exists in our system" },
          { status: 409 } // Conflict
        );
      }
      
      // Generic error for other cases
      return NextResponse.json(
        { error: "Unable to add player at this time" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data[0]);
  } catch (error: any) {
    // Log detailed server-side error
    console.error("Unexpected error in POST /api/players:", error);
    
    // Check if it's a client error (like invalid JSON)
    if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }
    
    // Return a generic message for all other errors
    return NextResponse.json(
      { error: "Unable to process your request at this time" },
      { status: 500 }
    );
  }
}