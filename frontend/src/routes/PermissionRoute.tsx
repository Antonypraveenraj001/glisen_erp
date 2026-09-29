import type {
    ReactNode,
  } from "react";
  
  import {
    ShieldX,
  } from "lucide-react";
  
  import {
    usePermissions,
  } from "../hooks/usePermissions";
  
  
  interface PermissionRouteProps {
    permission: string;
  
    children: ReactNode;
  }
  
  
  export default function PermissionRoute(
    {
      permission,
      children,
    }:
    PermissionRouteProps
  ) {
  
    const {
      hasPermission,
    } =
      usePermissions();
  
  
    if (
      hasPermission(
        permission
      )
    ) {
  
      return (
        <>
          {children}
        </>
      );
  
    }
  
  
    return (
      <div
        style={{
          minHeight:
            "360px",
  
          display:
            "flex",
  
          alignItems:
            "center",
  
          justifyContent:
            "center",
  
          padding:
            "30px",
        }}
      >
  
        <div
          style={{
            width:
              "100%",
  
            maxWidth:
              "520px",
  
            padding:
              "30px",
  
            border:
              "1px solid #dce5f0",
  
            borderRadius:
              "16px",
  
            background:
              "#ffffff",
  
            textAlign:
              "center",
  
            boxShadow:
              "0 8px 24px rgba(31, 57, 101, 0.05)",
          }}
        >
  
          <div
            style={{
              width:
                "48px",
  
              height:
                "48px",
  
              margin:
                "0 auto 14px",
  
              display:
                "flex",
  
              alignItems:
                "center",
  
              justifyContent:
                "center",
  
              borderRadius:
                "12px",
  
              background:
                "#fff2f2",
  
              color:
                "#ba4b4b",
            }}
          >
  
            <ShieldX
              size={23}
            />
  
          </div>
  
  
          <h2
            style={{
              margin:
                0,
  
              color:
                "#233d61",
  
              fontSize:
                "18px",
            }}
          >
            Access Denied
          </h2>
  
  
          <p
            style={{
              margin:
                "9px 0 0",
  
              color:
                "#8191a8",
  
              fontSize:
                "11px",
  
              lineHeight:
                1.6,
            }}
          >
  
            Your current role does not have permission
            to access this section.
  
          </p>
  
        </div>
  
      </div>
    );
  }