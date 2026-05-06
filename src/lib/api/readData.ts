import { apiGet } from "./client";
import type {
  ArchiveItemsResponse,
  ChildrenResponse,
  ClassAnalysesResponse,
  ClassesResponse,
  IndividualAnalysesResponse,
} from "./types";

export async function fetchClasses(): Promise<ClassesResponse> {
  return apiGet<ClassesResponse>("/api/classes");
}

export async function fetchChildrenInClass(classId: number): Promise<ChildrenResponse> {
  return apiGet<ChildrenResponse>(`/api/classes/${classId}/children`);
}

export async function fetchClassAnalysesForClass(classId: number): Promise<ClassAnalysesResponse> {
  return apiGet<ClassAnalysesResponse>(`/api/classes/${classId}/class-analyses`);
}

export async function fetchArchiveItemsForChild(childId: number): Promise<ArchiveItemsResponse> {
  return apiGet<ArchiveItemsResponse>(`/api/children/${childId}/archive-items`);
}

export async function fetchIndividualAnalysesForChild(
  childId: number,
): Promise<IndividualAnalysesResponse> {
  return apiGet<IndividualAnalysesResponse>(`/api/children/${childId}/individual-analyses`);
}
