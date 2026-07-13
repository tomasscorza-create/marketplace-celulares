import { useEffect, useState } from "react";

export function useManagementProductPagination() {
  const [managementSearch, setManagementSearch] = useState("");
  const [managementProductsPage, setManagementProductsPage] = useState(1);

  useEffect(() => {
    setManagementProductsPage(1);
  }, [managementSearch]);

  return {
    managementProductsPage,
    managementSearch,
    setManagementProductsPage,
    setManagementSearch,
  };
}
