import { useState, useCallback, useEffect } from "react";
import type { ProspectCard } from "@/types/card";

export function useCardTableActions(
  filteredCards: ProspectCard[],
  fetchCards: () => void,
  toast: (args: {
    title: string;
    description: string;
    variant?: string;
  }) => void,
  selectedEvent: { name: string } | null,
  dataFieldsMap: Map<string, string>
) {
  const handleArchiveSelected = useCallback(async (idsToArchive: string[]) => {
    try {
      if (!idsToArchive || idsToArchive.length === 0) {
        toast({
          title: "No Cards Selected",
          description: "Please select at least one card to archive.",
          variant: "destructive",
        });
        return;
      }
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${apiBaseUrl}/archive-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          document_ids: idsToArchive,
          status: "archived",
          review_status: "archived"
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to archive cards");
      }
      await fetchCards();
      toast({
        title: "Success",
        description: `${idsToArchive.length} card${idsToArchive.length === 1 ? '' : 's'} have been archived`,
      });
    } catch (error) {
      console.error("Error archiving cards:", error);
      toast({
        title: "Error",
        description: "Failed to archive cards",
        variant: "destructive",
      });
    }
  }, [toast, fetchCards]);

  const handleExportSelected = useCallback(async (idsToExport: string[]) => {
    try {
      if (!idsToExport || idsToExport.length === 0) {
        toast({
          title: "No Cards Selected",
          description: "Please select at least one card to export.",
          variant: "destructive",
        });
        return;
      }
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${apiBaseUrl}/mark-exported`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_ids: idsToExport }),
      });
      if (!response.ok) {
        throw new Error("Failed to mark cards as exported");
      }
      await fetchCards();
      toast({
        title: "Export Successful",
        description: `${idsToExport.length} ${idsToExport.length === 1 ? "card" : "cards"} exported successfully.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error exporting cards:", error);
      toast({
        title: "Export Failed",
        description: "Something went wrong while exporting cards. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast, fetchCards, selectedEvent, dataFieldsMap]);

  const handleDeleteSelected = useCallback(async (idsToDelete: string[]) => {
    try {
      if (!idsToDelete || idsToDelete.length === 0) {
        toast({
          title: "No Cards Selected",
          description: "Please select at least one card to delete.",
          variant: "destructive",
        });
        return;
      }
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${apiBaseUrl}/delete-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_ids: idsToDelete }),
      });
      if (!response.ok) {
        throw new Error("Failed to delete cards");
      }
      await fetchCards();
      toast({
        title: "Success",
        description: `${idsToDelete.length} card${idsToDelete.length === 1 ? '' : 's'} have been deleted`,
      });
    } catch (error) {
      console.error("Error deleting cards:", error);
      toast({
        title: "Error",
        description: "Failed to delete cards",
        variant: "destructive",
      });
    }
  }, [toast, fetchCards]);

  const handleMoveSelected = useCallback(async (idsToMove: string[]) => {
    try {
      if (!idsToMove || idsToMove.length === 0) {
        toast({
          title: "No Cards Selected",
          description: "Please select at least one card to move.",
          variant: "destructive",
        });
        return;
      }
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
      for (const documentId of idsToMove) {
        const response = await fetch(`${apiBaseUrl}/save-review/${documentId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "reviewed" }),
        });
        if (!response.ok) {
          throw new Error("Failed to move cards");
        }
      }
      await fetchCards();
      toast({
        title: "Success",
        description: `${idsToMove.length} card${idsToMove.length === 1 ? '' : 's'} have been moved to Ready to Export`,
      });
    } catch (error) {
      console.error("Error moving cards:", error);
      toast({
        title: "Error",
        description: "Failed to move cards",
        variant: "destructive",
      });
    }
  }, [toast, fetchCards]);

  const downloadCSV = useCallback(
    async (selectedIds: string[], table) => {
      try {
        if (!selectedIds || selectedIds.length === 0) {
          toast({
            title: "No Cards Selected",
            description: "Please select at least one card to export.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Exporting Cards",
          description: "Processing your export request...",
          variant: "default",
        });
        const apiBaseUrl =
          import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
        const response = await fetch(`${apiBaseUrl}/mark-exported`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ document_ids: selectedIds }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              `Failed to mark cards as exported (${response.status})`
          );
        }
        // Find the selected rows in the table by ID
        const selectedRows = table
          .getRowModel()
          .rows.filter((row) => selectedIds.includes(row.original.id));
        const headers = ["Event", ...Array.from(dataFieldsMap.values())];
        const csvContent = [
          headers.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
          ...selectedRows.map((row) => {
            const eventName = String(selectedEvent?.name || "Unknown Event");
            const fields = row.original.fields as Record<
              string,
              { value: string }
            >;
            return [
              `"${eventName.replace(/"/g, '""')}"`,
              ...Array.from(dataFieldsMap.keys()).map(
                (key) =>
                  `"${String(fields?.[key]?.value ?? "").replace(/"/g, '""')}"`
              ),
            ].join(",");
          }),
        ].join("\n");
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `card_data_${
          new Date().toISOString().split("T")[0]
        }.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await fetchCards();
        toast({
          title: "Export Successful",
          description: `${selectedIds.length} ${
            selectedIds.length === 1 ? "card" : "cards"
          } exported successfully.`,
          variant: "default",
        });
      } catch (error) {
        let message =
          "Something went wrong while exporting cards. Please try again.";
        if (error instanceof Error) message = error.message;
        toast({
          title: "Export Failed",
          description: message,
          variant: "destructive",
        });
      }
    },
    [dataFieldsMap, toast, fetchCards, selectedEvent]
  );

  return {
    handleArchiveSelected,
    handleExportSelected,
    handleDeleteSelected,
    handleMoveSelected,
    downloadCSV,
  };
}
