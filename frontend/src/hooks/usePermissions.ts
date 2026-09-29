import {
    useCallback,
    useMemo,
  } from "react";
  
  import {
    useAuth,
  } from "../context/AuthContext";
  
  
  export function usePermissions() {
  
    const {
      user,
    } =
      useAuth();
  
  
    const isBoss =
      user?.role
      === "Boss";
  
  
    const permissionSet =
      useMemo(
        () =>
          new Set(
            user?.permissions
            ??
            []
          ),
        [
          user?.permissions,
        ]
      );
  
  
    const hasPermission =
      useCallback(
        (
          permissionName:
            string
        ) => {
  
          if (
            isBoss
          ) {
            return true;
          }
  
  
          return (
            permissionSet.has(
              permissionName
            )
          );
  
        },
        [
          isBoss,
          permissionSet,
        ]
      );
  
  
    const hasAnyPermission =
      useCallback(
        (
          permissionNames:
            string[]
        ) => {
  
          if (
            isBoss
          ) {
            return true;
          }
  
  
          return (
            permissionNames.some(
              permissionName =>
                permissionSet.has(
                  permissionName
                )
            )
          );
  
        },
        [
          isBoss,
          permissionSet,
        ]
      );
  
  
    return {
      isBoss,
  
      permissions:
        permissionSet,
  
      hasPermission,
  
      hasAnyPermission,
    };
  }