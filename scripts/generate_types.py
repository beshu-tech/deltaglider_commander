#!/usr/bin/env python3
"""Generate TypeScript types from Pydantic models."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Type

from pydantic import BaseModel
from pydantic.json_schema import GenerateJsonSchema, JsonSchemaValue

# Import all contracts
from src.dgcommander.contracts.base import (
    BaseContract,
    ErrorDetail,
    ErrorResponse,
    PaginatedResponse,
    TypedResponse,
)
from src.dgcommander.contracts.buckets import (
    BucketListResponse,
    BucketStats,
    ComputeSavingsRequest,
    CreateBucketRequest,
    DeleteBucketRequest,
)
from src.dgcommander.contracts.downloads import (
    DownloadMetrics,
    DownloadPreparation,
    PrepareDownloadRequest,
    StreamingDownloadRequest,
)
from src.dgcommander.contracts.objects import (
    DeleteObjectRequest,
    FileMetadata,
    ObjectItem,
    ObjectListRequest,
    ObjectListResponse,
    ObjectMetadataUpdate,
    ObjectSortOrder,
)
from src.dgcommander.contracts.uploads import (
    BatchUploadRequest,
    UploadError,
    UploadProgressUpdate,
    UploadRequest,
    UploadResponse,
    UploadResult,
    UploadStats,
)


class TypeScriptGenerator:
    """Generate TypeScript types from Pydantic models."""

    def __init__(self):
        self.models: List[Type[BaseModel]] = []
        self.type_mapping = {
            "string": "string",
            "integer": "number",
            "number": "number",
            "boolean": "boolean",
            "array": "Array",
            "object": "Record<string, any>",
            "null": "null",
        }

    def add_model(self, model: Type[BaseModel]) -> None:
        """Add a model to generate types for."""
        self.models.append(model)

    def generate_schema(self) -> Dict[str, Any]:
        """Generate JSON schema for all models."""
        schema = {"definitions": {}}

        for model in self.models:
            model_schema = model.model_json_schema(mode='serialization')
            schema["definitions"][model.__name__] = model_schema

        return schema

    def json_schema_to_typescript(self, schema: Dict[str, Any]) -> str:
        """Convert JSON schema to TypeScript definitions."""
        output = []
        output.append("// Auto-generated TypeScript types from Pydantic models")
        output.append("// Do not edit manually - regenerate with: npm run generate:types")
        output.append("")

        # Process enums first
        enums = self._extract_enums(schema)
        for enum_name, enum_values in enums.items():
            output.append(f"export enum {enum_name} {{")
            for value in enum_values:
                output.append(f'  {value} = "{value}",')
            output.append("}")
            output.append("")

        # Process interfaces
        for name, definition in schema.get("definitions", {}).items():
            if definition.get("enum"):
                continue  # Skip enums, already processed

            output.append(f"export interface {name} {{")
            properties = definition.get("properties", {})
            required = set(definition.get("required", []))

            for prop_name, prop_def in properties.items():
                ts_type = self._get_typescript_type(prop_def)
                optional = "" if prop_name in required else "?"
                output.append(f"  {prop_name}{optional}: {ts_type};")

            output.append("}")
            output.append("")

        return "\n".join(output)

    def _extract_enums(self, schema: Dict[str, Any]) -> Dict[str, List[str]]:
        """Extract enum definitions from schema."""
        enums = {}
        for name, definition in schema.get("definitions", {}).items():
            if "enum" in definition:
                enums[name] = definition["enum"]
        return enums

    def _get_typescript_type(self, prop_def: Dict[str, Any]) -> str:
        """Convert JSON schema type to TypeScript type."""
        if "$ref" in prop_def:
            # Reference to another type
            ref_name = prop_def["$ref"].split("/")[-1]
            return ref_name

        if "enum" in prop_def:
            # Inline enum - should be extracted
            return "string"

        if "anyOf" in prop_def:
            # Union type
            types = [self._get_typescript_type(t) for t in prop_def["anyOf"]]
            # Filter out null for optional handling
            types = [t for t in types if t != "null"]
            if len(types) == 1:
                return types[0]
            return " | ".join(types)

        prop_type = prop_def.get("type", "any")

        if prop_type == "array":
            items_type = self._get_typescript_type(prop_def.get("items", {}))
            return f"{items_type}[]"

        if prop_type == "object":
            if "additionalProperties" in prop_def:
                value_type = self._get_typescript_type(prop_def["additionalProperties"])
                return f"Record<string, {value_type}>"
            return "Record<string, any>"

        return self.type_mapping.get(prop_type, "any")

    def generate_api_client(self) -> str:
        """Generate type-safe API client."""
        output = []
        output.append("// Type-safe API client")
        output.append('import { z } from "zod";')
        output.append('import * as types from "./types";')
        output.append("")
        output.append("export class TypedApiClient {")
        output.append("  constructor(private baseUrl: string) {}")
        output.append("")

        # Generate methods for each endpoint
        output.append("  // Bucket operations")
        output.append("  async listBuckets(): Promise<types.BucketListResponse> {")
        output.append('    return this.request<types.BucketListResponse>("GET", "/api/buckets/");')
        output.append("  }")
        output.append("")
        output.append("  async createBucket(data: types.CreateBucketRequest): Promise<void> {")
        output.append('    return this.request<void>("POST", "/api/buckets/", data);')
        output.append("  }")
        output.append("")

        output.append("  // Object operations")
        output.append("  async listObjects(params: types.ObjectListRequest): Promise<types.ObjectListResponse> {")
        output.append('    return this.request<types.ObjectListResponse>("GET", "/api/objects/", undefined, params);')
        output.append("  }")
        output.append("")

        output.append("  // Generic request method")
        output.append("  private async request<T>(")
        output.append("    method: string,")
        output.append("    path: string,")
        output.append("    body?: any,")
        output.append("    params?: Record<string, any>")
        output.append("  ): Promise<T> {")
        output.append("    const url = new URL(path, this.baseUrl);")
        output.append("    if (params) {")
        output.append("      Object.entries(params).forEach(([key, value]) => {")
        output.append("        if (value !== undefined) url.searchParams.set(key, String(value));")
        output.append("      });")
        output.append("    }")
        output.append("")
        output.append("    const response = await fetch(url.toString(), {")
        output.append("      method,")
        output.append('      headers: { "Content-Type": "application/json" },')
        output.append("      body: body ? JSON.stringify(body) : undefined,")
        output.append("    });")
        output.append("")
        output.append("    if (!response.ok) {")
        output.append("      const error = await response.json();")
        output.append("      throw new ApiError(error);")
        output.append("    }")
        output.append("")
        output.append("    return response.json();")
        output.append("  }")
        output.append("}")
        output.append("")
        output.append("export class ApiError extends Error {")
        output.append("  constructor(public data: types.ErrorResponse) {")
        output.append("    super(data.error.message);")
        output.append("  }")
        output.append("}")

        return "\n".join(output)


def main():
    """Generate TypeScript types and save to frontend."""
    generator = TypeScriptGenerator()

    # Add all models
    models = [
        # Base
        BaseContract,
        TypedResponse,
        PaginatedResponse,
        ErrorResponse,
        ErrorDetail,
        # Buckets
        BucketStats,
        BucketListResponse,
        CreateBucketRequest,
        DeleteBucketRequest,
        ComputeSavingsRequest,
        # Objects
        ObjectItem,
        ObjectListResponse,
        ObjectListRequest,
        FileMetadata,
        DeleteObjectRequest,
        ObjectMetadataUpdate,
        # Uploads
        UploadResult,
        UploadStats,
        UploadResponse,
        UploadError,
        UploadRequest,
        BatchUploadRequest,
        UploadProgressUpdate,
        # Downloads
        DownloadPreparation,
        PrepareDownloadRequest,
        StreamingDownloadRequest,
        DownloadMetrics,
    ]

    for model in models:
        generator.add_model(model)

    # Generate schema and TypeScript
    schema = generator.generate_schema()
    typescript = generator.json_schema_to_typescript(schema)
    api_client = generator.generate_api_client()

    # Save to frontend
    output_dir = Path("frontend/src/types")
    output_dir.mkdir(parents=True, exist_ok=True)

    # Save types
    types_file = output_dir / "api.generated.ts"
    types_file.write_text(typescript)
    print(f"Generated TypeScript types: {types_file}")

    # Save client
    client_file = output_dir / "client.generated.ts"
    client_file.write_text(api_client)
    print(f"Generated API client: {client_file}")

    # Save schema for documentation
    schema_file = output_dir / "schema.json"
    schema_file.write_text(json.dumps(schema, indent=2))
    print(f"Generated JSON schema: {schema_file}")


if __name__ == "__main__":
    main()