<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;

class UserController extends Controller
{
    public function index()
    {
        // Return only necessary fields for the dropdown
        $users = User::select('id', 'name')->get();
        return response()->json($users);
    }
}
