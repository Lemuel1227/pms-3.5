<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\User;

class UserController extends Controller
{
    public function index()
    {
        $users = User::select('id', 'name')->get();
        return response()->json($users);
    }
    
    public function show()
    {
        return response()->json(auth('sanctum')->user());
    }
}
