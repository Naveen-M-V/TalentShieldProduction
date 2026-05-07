import React from "react";
import { Link } from "react-router-dom";

export default function NoAccess() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4"> Under development</h1>
        <p className="text-gray-700 mb-6">
          You do not have permission to view this page.
        </p>
        <Link
          to="/"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}
